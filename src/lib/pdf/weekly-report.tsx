import "server-only";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";
import { registerMontserrat } from "@/lib/pdf/fonts";
import { getWeeklyBrief, type WeeklyBrief } from "@/server/queries/weekly-brief";
import { weekOptionLabel } from "@/lib/reports/weekly-brief-core";
import { toBcp47 } from "@/i18n/bcp47";

registerMontserrat();

const FONT = "Times New Roman";
const INK = "#000000";
const MUTED = "#444444";
const LINE = "0.75pt solid #000000";

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 11, fontFamily: FONT, color: INK, lineHeight: 1.45 },
  org: { textAlign: "center", fontSize: 11, color: MUTED },
  h1: { textAlign: "center", fontSize: 16, fontWeight: 700, marginTop: 4, textTransform: "uppercase" },
  week: { textAlign: "center", fontSize: 12, marginTop: 2, marginBottom: 16 },
  section: { marginTop: 14 },
  h2: { fontSize: 12, fontWeight: 700, marginBottom: 6, paddingBottom: 3, borderBottom: LINE, textTransform: "uppercase" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #BBBBBB", paddingVertical: 3 },
  cellLabel: { flex: 1, fontSize: 11 },
  cellValue: { width: 120, textAlign: "right", fontSize: 11, fontWeight: 700 },
  delta: { color: MUTED, fontWeight: 400, fontSize: 10 },
  bullet: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 12, fontSize: 11 },
  bulletText: { flex: 1, fontSize: 11 },
  sub: { fontSize: 10, color: MUTED, marginLeft: 12, marginBottom: 3 },
  summary: { fontSize: 11, marginTop: 2 },
  by: { fontSize: 10, color: MUTED, marginTop: 4 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, textAlign: "center", fontSize: 9, color: MUTED, borderTop: "0.5pt solid #BBBBBB", paddingTop: 6 },
});

const METRICS: (keyof WeeklyBrief["metrics"])[] = [
  "activeProjects", "overdueStages", "dueSoonStages", "overdueTasks", "reviewQueue",
  "pendingRequests", "stagesCompleted", "tasksCreated", "tasksCompleted", "paidUzs", "newProjects",
];

export async function buildWeeklyReportPdf(week: string, opts: { canMoney: boolean; locale: string }): Promise<Buffer> {
  const [brief, t] = await Promise.all([
    getWeeklyBrief(week, { canMoney: opts.canMoney, locale: opts.locale }),
    getTranslations({ locale: opts.locale, namespace: "staffX.weeklyBrief" }),
  ]);
  const nf = new Intl.NumberFormat(toBcp47(opts.locale));
  const fmtInt = (n: number) => nf.format(Math.round(n));
  const topNames = (arr: { projectName?: string; name?: string }[], n = 5) =>
    arr.slice(0, n).map((x) => x.projectName ?? x.name ?? "—").join(", ");

  const metricRow = (key: keyof WeeklyBrief["metrics"]) => {
    const isMoney = key === "paidUzs";
    const masked = isMoney && !brief.canMoney;
    const val = masked ? "***" : isMoney ? `${fmtInt(brief.metrics[key])} UZS` : fmtInt(brief.metrics[key]);
    const d = brief.prev && !masked ? brief.metrics[key] - brief.prev[key] : 0;
    return (
      <View style={s.row} key={key}>
        <Text style={s.cellLabel}>{t(`kpi.${key}` as "kpi.activeProjects")}</Text>
        <Text style={s.cellValue}>
          {val}
          {d !== 0 ? <Text style={s.delta}>{`  (${d > 0 ? "+" : "−"}${fmtInt(Math.abs(d))})`}</Text> : null}
        </Text>
      </View>
    );
  };

  const ev = brief.events;
  const att = brief.attention;
  const paidTotal = ev.payments.reduce((sum, p) => sum + (typeof p.amount === "number" ? p.amount : 0), 0);

  const bullet = (label: string, value: string) => (
    <View style={s.bullet}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{label}: <Text style={{ fontWeight: 700 }}>{value}</Text></Text>
    </View>
  );

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.org}>{t("pdf.org")}</Text>
        <Text style={s.h1}>{t("pdf.reportTitle")}</Text>
        <Text style={s.week}>{t("week")}: {weekOptionLabel(week)}</Text>

        <View style={s.section}>
          <Text style={s.h2}>{t("pdf.metrics")}</Text>
          {METRICS.map(metricRow)}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>{t("pdf.thisWeek")}</Text>
          {bullet(t("pdf.completedStages"), fmtInt(ev.completedStages.length))}
          {bullet(t("pdf.newProjects"), fmtInt(ev.newProjects.length))}
          {bullet(t("pdf.tasksCompleted"), fmtInt(brief.metrics.tasksCompleted))}
          {bullet(t("pdf.payments"), brief.canMoney ? `${fmtInt(paidTotal)} UZS` : "***")}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>{t("pdf.attention")}</Text>
          {bullet(t("pdf.silentProjects"), fmtInt(att.silentProjects.length))}
          {att.silentProjects.length > 0 ? <Text style={s.sub}>{topNames(att.silentProjects)}</Text> : null}
          {bullet(t("pdf.waitingReview"), fmtInt(att.waitingReview.length))}
          {att.waitingReview.length > 0 ? <Text style={s.sub}>{topNames(att.waitingReview)}</Text> : null}
          {bullet(t("pdf.overrunning"), fmtInt(att.overrunning.length))}
          {att.overrunning.length > 0 ? <Text style={s.sub}>{topNames(att.overrunning)}</Text> : null}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>{t("pdf.summaryTitle")}</Text>
          {brief.summary?.note ? (
            <>
              <Text style={s.summary}>{brief.summary.note}</Text>
              {brief.summary.byName ? <Text style={s.by}>— {brief.summary.byName}</Text> : null}
            </>
          ) : (
            <Text style={{ fontSize: 11, color: MUTED }}>{t("pdf.noSummary")}</Text>
          )}
        </View>

        <Text style={s.footer} fixed>
          {t("pdf.org")}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
