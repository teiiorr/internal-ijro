import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import React from "react";
import { db } from "@/lib/db";
import { standupReports, users, departments, tasks } from "@/lib/db/schema";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica" },
  h1: { fontSize: 20, marginBottom: 12 },
  h2: { fontSize: 14, marginTop: 16, marginBottom: 6 },
  small: { color: "#6B7280", fontSize: 9 },
  row: { flexDirection: "row", marginBottom: 4 },
  cell: { flex: 1 },
  card: { marginBottom: 8, padding: 8, border: "1pt solid #E5E7EB", borderRadius: 6 },
});

export async function buildWeeklyReportPdf(): Promise<Buffer> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().slice(0, 10);

  const [reports, completed, created, deptCounts] = await Promise.all([
    db
      .select({
        userName: users.fullName,
        deptName: departments.name,
        reportDate: standupReports.reportDate,
        doneYesterday: standupReports.doneYesterday,
        plannedToday: standupReports.plannedToday,
        blockers: standupReports.blockers,
      })
      .from(standupReports)
      .innerJoin(users, eq(users.id, standupReports.userId))
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(gte(standupReports.reportDate, sinceStr))
      .orderBy(desc(standupReports.reportDate)),
    db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(and(sql`${tasks.completedAt} >= ${since}`)),
    db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.createdAt} >= ${since}`),
    db
      .select({
        deptName: departments.name,
        completed: sql<number>`count(*) filter (where status='completed')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .innerJoin(users, eq(users.id, tasks.assignedToUserId))
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(sql`${tasks.createdAt} >= ${since}`)
      .groupBy(departments.name),
  ]);

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Weekly report</Text>
        <Text style={s.small}>Period: {sinceStr} — {new Date().toISOString().slice(0, 10)}</Text>

        <Text style={s.h2}>Summary</Text>
        <View style={s.row}>
          <View style={s.cell}><Text>Tasks created: {created[0]?.c ?? 0}</Text></View>
          <View style={s.cell}><Text>Tasks completed: {completed[0]?.c ?? 0}</Text></View>
        </View>

        <Text style={s.h2}>By department</Text>
        {deptCounts.length === 0 ? <Text style={s.small}>No data.</Text> : (
          deptCounts.map((d, i) => (
            <View key={i} style={s.row}>
              <View style={s.cell}><Text>{d.deptName ?? "—"}</Text></View>
              <View style={s.cell}><Text>{d.completed} / {d.total}</Text></View>
            </View>
          ))
        )}

        <Text style={s.h2}>Standup reports</Text>
        {reports.length === 0 ? <Text style={s.small}>No reports.</Text> : (
          reports.slice(0, 30).map((r, i) => (
            <View key={i} style={s.card}>
              <Text style={s.small}>{r.userName}{r.deptName ? ` · ${r.deptName}` : ""} · {r.reportDate}</Text>
              {r.doneYesterday && <Text>Done: {r.doneYesterday}</Text>}
              {r.plannedToday && <Text>Plan: {r.plannedToday}</Text>}
              {r.blockers && <Text>Blockers: {r.blockers}</Text>}
            </View>
          ))
        )}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
