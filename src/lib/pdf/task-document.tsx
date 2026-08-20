import "server-only";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, taskAssignees, tasks, users } from "@/lib/db/schema";
import { registerMontserrat } from "@/lib/pdf/fonts";
import { shortName } from "@/lib/names";

registerMontserrat();

const FONT = "Times New Roman";
const INK = "#000000";
const MUTED = "#444444";
const ACCENT = "#1B4F72";

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 72,
    paddingHorizontal: 72,
    fontSize: 14,
    fontFamily: FONT,
    color: INK,
    lineHeight: 1.5,
  },
  header: {
    textAlign: "center",
    marginBottom: 8,
  },
  orgName: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
  },
  orgSub: {
    fontSize: 12,
    textAlign: "center",
    color: MUTED,
    marginTop: 2,
  },
  divider: {
    borderBottom: "1.5pt solid #000000",
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 1.5,
  },
  regNum: {
    fontSize: 12,
    textAlign: "center",
    color: MUTED,
    marginBottom: 20,
  },
  infoTable: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoLabel: {
    width: 170,
    fontSize: 14,
    fontWeight: 700,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
    borderBottom: "0.75pt solid #000000",
    paddingBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1pt solid #000000",
    borderTop: "1pt solid #000000",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#F0F0F0",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #CCCCCC",
  },
  numCol: {
    width: 30,
    textAlign: "center",
  },
  nameCol: {
    flex: 3,
  },
  statusCol: {
    flex: 1,
    textAlign: "right",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 72,
    right: 72,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 10,
    color: MUTED,
  },
  stampOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  stampInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 0.75,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  stampTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: ACCENT,
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Montserrat",
  },
  stampSub: {
    fontSize: 6,
    color: ACCENT,
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 0.5,
    fontFamily: "Montserrat",
  },
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

const PRIORITY_UZ: Record<string, string> = {
  urgent: "Shoshilinch",
  high: "Yuqori",
  medium: "O'rta",
  low: "Past",
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
        {/* Organization header */}
        <View style={s.header}>
          <Text style={s.orgName}>Bolalar Kontentini Rivojlantirish Markazi</Text>
          <Text style={s.orgSub}>Ichki Ijro Tizimi</Text>
        </View>
        <View style={s.divider} />

        {/* Document title */}
        <Text style={s.title}>Topshiriq</Text>
        {task.registrationNumber && (
          <Text style={s.regNum}>No {task.registrationNumber}</Text>
        )}

        {/* Info fields */}
        <View style={s.infoTable}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Topshiriq bergan:</Text>
            <Text style={s.infoValue}>
              {shortName(creatorName)}, {POSITION_LABEL[creatorPosition] ?? creatorPosition}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Berilgan sana:</Text>
            <Text style={s.infoValue}>{fmt(task.createdAt)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Bajarish muddati:</Text>
            <Text style={[s.infoValue, task.deadline && new Date(task.deadline) < new Date() && !["completed", "rejected"].includes(task.status) ? { color: "#CC0000" } : {}]}>
              {fmt(task.deadline)}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Muhimlik:</Text>
            <Text style={s.infoValue}>{PRIORITY_UZ[task.priority] ?? task.priority}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Holati:</Text>
            <Text style={s.infoValue}>{STATUS_UZ[task.status] ?? task.status}</Text>
          </View>
        </View>

        {/* Task content */}
        <Text style={s.sectionTitle}>Topshiriq mazmuni</Text>
        <Text style={[s.body, { fontWeight: 700, marginBottom: 4 }]}>{task.title}</Text>
        {task.description && (
          <Text style={s.body}>{task.description}</Text>
        )}

        {/* Assignees */}
        <Text style={s.sectionTitle}>Ijrochilar</Text>
        <View style={s.tableHeader}>
          <View style={s.numCol}>
            <Text style={s.tableHeaderText}>No</Text>
          </View>
          <View style={s.nameCol}>
            <Text style={s.tableHeaderText}>Xodim</Text>
          </View>
          <View style={s.statusCol}>
            <Text style={s.tableHeaderText}>Holati</Text>
          </View>
        </View>
        {assigneeRows.map((a, i) => (
          <View key={i} style={s.tableRow}>
            <View style={s.numCol}>
              <Text style={{ fontSize: 14 }}>{i + 1}</Text>
            </View>
            <View style={s.nameCol}>
              <Text style={{ fontSize: 14, fontWeight: 700 }}>{shortName(a.fullName)}</Text>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {(POSITION_LABEL[a.position] ?? a.position) + (a.deptName ? ` · ${a.deptName}` : "")}
              </Text>
              {a.responseText && (
                <Text style={{ fontSize: 12, marginTop: 4, fontStyle: "italic" }}>
                  Javob: {a.responseText.length > 200 ? a.responseText.slice(0, 200) + "..." : a.responseText}
                </Text>
              )}
            </View>
            <View style={s.statusCol}>
              <Text style={{ fontSize: 13, fontWeight: 700 }}>{STATUS_UZ[a.status] ?? a.status}</Text>
              {a.responseSubmittedAt && (
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{fmt(a.responseSubmittedAt as Date)}</Text>
              )}
            </View>
          </View>
        ))}

        {/* Footer with stamp */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerText}>{task.registrationNumber ?? ""}</Text>
            <Text style={[s.footerText, { marginTop: 2 }]}>
              <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </Text>
          </View>
          <View style={s.stampOuter}>
            <View style={s.stampInner}>
              <Text style={[s.stampSub, { marginBottom: 1 }]}>TEIIOR DEV</Text>
              <Text style={s.stampTitle}>ICHKI</Text>
              <Text style={s.stampTitle}>IJRO</Text>
              <Text style={s.stampSub}>{"★"}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
