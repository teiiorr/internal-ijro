// Topşiriq hujjatlari (ilovalar) qoidalari: kim qöşa oladi, kim öçira oladi, kim köra
// oladi va fayl qayerda saqlanadi. Sof mantiq (DB yöq): API, server amallari va UI bir xil
// qoidaga tayanadi va unit-testlar bilan tekşiriladi.

/** Bitta topşiriqqa biriktiriladigan hujjatlar soni çegarasi. */
export const MAX_TASK_ATTACHMENTS = 20;

export type AttachmentViewer = { id: string; position: string };

/** Topşiriqdagi iştirok: kim bergan va kimlar ijroçi. */
export type TaskParticipation = { createdByUserId: string; assigneeIds: readonly string[] };

const LEADERS = new Set(["direktor", "orinbosar"]);

function isContractor(v: AttachmentViewer): boolean {
  return v.position === "kontragent";
}

/**
 * Hujjat qöşiş: topşiriq bergan xodim, içki ijroçilar va rahbariyat (direktor, örinbosar).
 * Studiya (kontragent) hujjat qöşmaydi, u öz faylini «Javobim» orqali yuboradi.
 */
export function canAddTaskAttachments(viewer: AttachmentViewer, task: TaskParticipation): boolean {
  if (isContractor(viewer)) return false;
  return LEADERS.has(viewer.position) || task.createdByUserId === viewer.id || task.assigneeIds.includes(viewer.id);
}

/** Öçiriş: hujjatni yuklagan xodim, topşiriq bergan xodim yoki rahbariyat. */
export function canDeleteTaskAttachment(
  viewer: AttachmentViewer,
  task: Pick<TaskParticipation, "createdByUserId">,
  uploadedByUserId: string | null | undefined,
): boolean {
  if (isContractor(viewer)) return false;
  return LEADERS.has(viewer.position) || task.createdByUserId === viewer.id || (!!uploadedByUserId && uploadedByUserId === viewer.id);
}

/**
 * Köriş va yuklab oliş: içki xodimlar (topşiriq sahifasi ularga oçiq) va faqat öziga
 * tayinlangan topşiriq böyiça studiya.
 */
export function canViewTaskAttachments(viewer: AttachmentViewer, task: Pick<TaskParticipation, "assigneeIds">): boolean {
  if (!isContractor(viewer)) return true;
  return task.assigneeIds.includes(viewer.id);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID.test(v);
}

/** Diskdagi papka (yuklamalar ildiziga nisbatan): eski yozuvlar bilan bir xil joy. */
export function taskAttachmentDir(taskId: string): string {
  return `task-attachments/${taskId}`;
}

/** `fileUrl` (/api/files/task-attachments/<taskId>/<fayl>) → papka va fayl nomi. */
export function parseTaskAttachmentUrl(fileUrl: string | null | undefined): { taskId: string; fileName: string } | null {
  const m = /^\/api\/files\/task-attachments\/([^/]+)\/([^/]+)$/.exec(fileUrl ?? "");
  if (!m || !isUuid(m[1]) || m[2] === "." || m[2] === "..") return null;
  return { taskId: m[1], fileName: m[2] };
}
