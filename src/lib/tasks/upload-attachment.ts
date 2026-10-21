// Brauzerdan topşiriqqa bitta faylni yuklaş (/api/task-attachments ga oqim sifatida).
// fetch yuklaş jarayonini körsatmaydi, şuning uçun XMLHttpRequest: progress çiziği uçun.

export type UploadResult = { ok: true; id?: string } | { ok: false; error: string };

export function uploadTaskAttachment(
  taskId: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const qs = new URLSearchParams({ taskId, name: file.name });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/task-attachments?${qs.toString()}`);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => {
      let body: { ok?: boolean; id?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* javob JSON emas */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve({ ok: true, id: body.id });
      else resolve({ ok: false, error: body.error ?? (xhr.status === 413 ? "file_too_large" : "upload_failed") });
    };
    xhr.onerror = () => resolve({ ok: false, error: "network" });
    xhr.onabort = () => resolve({ ok: false, error: "aborted" });
    xhr.send(file);
  });
}
