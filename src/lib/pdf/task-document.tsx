import "server-only";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, taskAssignees, tasks, users } from "@/lib/db/schema";

const s = StyleSheet.create({
  page: { padding: "20mm 18mm", fontSize: 11, fontFamily: "Helvetica", color: "#0A0A0F" },
  topbar: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1pt solid #DEDEE2", paddingBottom: 8, marginBottom: 14 },
  brand: { fontSize: 10, color: "#65676E", letterSpacing: 1, textTransform: "uppercase" },
  regNum: { fontSize: 11, color: "#5E63E0", fontWeight: 700 },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 16, marginTop: 4 },
  metaRow: { flexDirection: "row", marginBottom: 10 },
  metaCol: { flex: 1, paddingRight: 12 },
  eyebrow: { fontSize: 8, color: "#65676E", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  metaValue: { fontSize: 11 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#0A0A0F" },
  body: { fontSize: 11, lineHeight: 1.55 },
  assigneeRow: { flexDirection: "row", paddingVertical: 6, borderBottom: "0.5pt solid #ECECEF" },
  assigneeCol: { flex: 2 },
  statusCol: { flex: 1, textAlign: "right" },
  footer: { position: "absolute", bottom: 16, left: 18, right: 18, fontSize: 9, color: "#9295A0", flexDirection: "row", justifyContent: "space-between", borderTop: "0.5pt solid #ECECEF", paddingTop: 6 },
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
        <View style={s.topbar}>
          <Text style={s.brand}>Bolalar Kontentini Rivojlantirish Markazi · Ichki Ijro</Text>
          {task.registrationNumber && <Text style={s.regNum}>№ {task.registrationNumber}</Text>}
        </View>

        <Text style={s.h1}>Topshiriq</Text>

        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.eyebrow}>Topshiriq bergan</Text>
            <Text style={s.metaValue}>{creatorName}</Text>
            <Text style={{ fontSize: 9, color: "#65676E", marginTop: 2 }}>
              {POSITION_LABEL[creatorPosition] ?? creatorPosition}
            </Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.eyebrow}>Berilgan sana</Text>
            <Text style={s.metaValue}>{fmt(task.createdAt)}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.eyebrow}>Bajarish muddati</Text>
            <Text style={[s.metaValue, task.deadline && new Date(task.deadline) < new Date() && !["completed", "rejected"].includes(task.status) ? { color: "#DC2626", fontWeight: 700 } : {}]}>
              {fmt(task.deadline)}
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Topshiriq mazmuni</Text>
          <Text style={s.body}>{task.title}</Text>
          {task.description ? <Text style={[s.body, { marginTop: 6 }]}>{task.description}</Text> : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ijrochilar ro'yxati</Text>
          {assigneeRows.map((a, i) => (
            <View key={i} style={s.assigneeRow}>
              <View style={s.assigneeCol}>
                <Text style={{ fontSize: 11, fontWeight: 600 }}>{a.fullName}</Text>
                <Text style={{ fontSize: 9, color: "#65676E", marginTop: 1 }}>
                  {(POSITION_LABEL[a.position] ?? a.position) + (a.deptName ? ` · ${a.deptName}` : "")}
                </Text>
                {a.responseText ? (
                  <Text style={{ fontSize: 10, color: "#0A0A0F", marginTop: 3, fontStyle: "italic" }}>
                    Javob: {a.responseText.length > 200 ? a.responseText.slice(0, 200) + "..." : a.responseText}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 9, color: "#9295A0", marginTop: 3 }}>Javob kiritilmagan</Text>
                )}
              </View>
              <View style={s.statusCol}>
                <Text style={{ fontSize: 10, fontWeight: 600 }}>{STATUS_UZ[a.status] ?? a.status}</Text>
                {a.responseSubmittedAt ? (
                  <Text style={{ fontSize: 9, color: "#65676E", marginTop: 2 }}>{fmt(a.responseSubmittedAt as Date)}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text>{task.registrationNumber ?? ""}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
