import "server-only";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, taskAssignees, tasks, users } from "@/lib/db/schema";
import { registerMontserrat } from "@/lib/pdf/fonts";

registerMontserrat();

const INK = "#111111";
const MUTED = "#3A3A3A";
const ACCENT = "#1B4F72";
const BORDER = "#CCCCCC";

const s = StyleSheet.create({
  page: { padding: "22mm 20mm", fontSize: 11, fontFamily: "Montserrat", color: INK },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `1.5pt solid ${ACCENT}`, paddingBottom: 10, marginBottom: 18 },
  brand: { fontSize: 9, color: ACCENT, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" },
  regNum: { fontSize: 12, color: ACCENT, fontWeight: 700 },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 20, marginTop: 6, color: INK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 },
  metaRow: { flexDirection: "row", marginBottom: 14, gap: 12 },
  metaCol: { flex: 1 },
  eyebrow: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3, fontWeight: 600 },
  metaValue: { fontSize: 11, color: INK, fontWeight: 500 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: INK, borderBottom: `0.75pt solid ${BORDER}`, paddingBottom: 4 },
  body: { fontSize: 11, lineHeight: 1.6, color: INK },
  tableHeader: { flexDirection: "row", backgroundColor: "#E8EEF3", paddingVertical: 6, paddingHorizontal: 8, borderBottom: `1pt solid ${BORDER}` },
  tableHeaderText: { fontSize: 9, fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.5 },
  assigneeRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottom: `0.5pt solid ${BORDER}` },
  assigneeCol: { flex: 3 },
  statusCol: { flex: 1, textAlign: "right", alignItems: "flex-end", justifyContent: "center" },
  footer: { position: "absolute", bottom: 20, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footerText: { fontSize: 8, color: MUTED },
  // Stamp
  stampOuter: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: ACCENT, alignItems: "center", justifyContent: "center" },
  stampInner: { width: 76, height: 76, borderRadius: 38, borderWidth: 0.75, borderColor: ACCENT, alignItems: "center", justifyContent: "center" },
  stampTitle: { fontSize: 10, fontWeight: 700, color: ACCENT, textAlign: "center", letterSpacing: 1 },
  stampSub: { fontSize: 6, color: ACCENT, textAlign: "center", marginTop: 2, letterSpacing: 0.5 },
});

const POSITION_LABEL: Record<string, string> = {
  direktor: "Direktor",
  orinbosar: "O'rinbosar",
  koordinator: "Koordinator",
  bolim_boshligi: "Bo'lim Boshlig'i",
  bosh_mutaxassis: "Bosh mutaxassis",
  yetakchi_mutaxassis: "Yetakchi mutaxassis",
  mutaxassis: "Mutaxassis",
  hr: "HR",
  kontragent: "Pudratchi",
};

const STATUS_UZ: Record<string, string> = {
  todo: "Bajarilishi kerak",
  in_progress: "Bajarilmoqda",
  under_review: "Tekshiruvda",
  completed: "Bajarildi",
  rejected: "Rad etildi",
};

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  const x = new Date(d);
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${x.getFullYear()}`;
}

export async function buildTaskDocumentPdf(taskId: string): Promise<Buffer | null> {
  const row = await db
    .select({
      task: tasks,
      creatorName: users.fullName,
      creatorPosition: users.position,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.createdByUserId))
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (row.length === 0) return null;
  const { task, creatorName, creatorPosition } = row[0];

  const assigneeRows = await db
    .select({
      fullName: users.fullName,
      position: users.position,
      deptName: departments.name,
      status: taskAssignees.status,
      responseText: taskAssignees.responseText,
      responseSubmittedAt: taskAssignees.responseSubmittedAt,
    })
    .from(taskAssignees)
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(taskAssignees.taskId, taskId));

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header bar */}
        <View style={s.topbar}>
          <View>
            <Text style={s.brand}>Bolalar Kontentini Rivojlantirish Markazi</Text>
            <Text style={[s.brand, { marginTop: 2 }]}>Ichki Ijro Tizimi</Text>
          </View>
          {task.registrationNumber && <Text style={s.regNum}>No {task.registrationNumber}</Text>}
        </View>

        <Text style={s.h1}>Topshiriq</Text>

        {/* Meta info */}
        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.eyebrow}>Topshiriq bergan</Text>
            <Text style={[s.metaValue, { fontWeight: 700 }]}>{creatorName}</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
              {POSITION_LABEL[creatorPosition] ?? creatorPosition}
            </Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.eyebrow}>Berilgan sana</Text>
            <Text style={s.metaValue}>{fmt(task.createdAt)}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.eyebrow}>Bajarish muddati</Text>
            <Text style={[s.metaValue, { fontWeight: 700 }, task.deadline && new Date(task.deadline) < new Date() && !["completed", "rejected"].includes(task.status) ? { color: "#C0392B" } : {}]}>
              {fmt(task.deadline)}
            </Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.eyebrow}>Muhimlik</Text>
            <Text style={[s.metaValue, { fontWeight: 600 }]}>
              {task.priority === "urgent" ? "Shoshilinch" : task.priority === "high" ? "Yuqori" : task.priority === "low" ? "Past" : "Oddiy"}
            </Text>
          </View>
        </View>

        {/* Task content */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Topshiriq mazmuni</Text>
          <Text style={[s.body, { fontWeight: 600 }]}>{task.title}</Text>
          {task.description ? <Text style={[s.body, { marginTop: 8 }]}>{task.description}</Text> : null}
        </View>

        {/* Assignees table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ijrochilar</Text>
          <View style={s.tableHeader}>
            <View style={s.assigneeCol}>
              <Text style={s.tableHeaderText}>Xodim</Text>
            </View>
            <View style={s.statusCol}>
              <Text style={s.tableHeaderText}>Holati</Text>
            </View>
          </View>
          {assigneeRows.map((a, i) => (
            <View key={i} style={s.assigneeRow}>
              <View style={s.assigneeCol}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: INK }}>{a.fullName}</Text>
                <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
                  {(POSITION_LABEL[a.position] ?? a.position) + (a.deptName ? ` · ${a.deptName}` : "")}
                </Text>
                {a.responseText ? (
                  <Text style={{ fontSize: 10, color: INK, marginTop: 4, fontStyle: "italic" }}>
                    Javob: {a.responseText.length > 200 ? a.responseText.slice(0, 200) + "..." : a.responseText}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 9, color: MUTED, marginTop: 3 }}>Javob kiritilmagan</Text>
                )}
              </View>
              <View style={s.statusCol}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: INK }}>{STATUS_UZ[a.status] ?? a.status}</Text>
                {a.responseSubmittedAt ? (
                  <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{fmt(a.responseSubmittedAt as Date)}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Footer with stamp */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerText}>{task.registrationNumber ?? ""}</Text>
            <Text style={[s.footerText, { marginTop: 2 }]}>
              <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </Text>
          </View>
          {/* Round stamp */}
          <View style={s.stampOuter}>
            <View style={s.stampInner}>
              <Text style={[s.stampSub, { marginBottom: 1 }]}>BKRM</Text>
              <Text style={s.stampTitle}>ICHKI</Text>
              <Text style={s.stampTitle}>IJRO</Text>
              <Text style={s.stampSub}>★</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
