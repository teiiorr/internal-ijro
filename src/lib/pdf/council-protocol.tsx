import "server-only";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { registerMontserrat } from "@/lib/pdf/fonts";
import { getMeetingForProtocol } from "@/server/queries/councils";

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
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    color: MUTED,
    marginBottom: 2,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 10,
    borderBottom: "0.75pt solid #000000",
    paddingBottom: 4,
  },
  item: {
    marginBottom: 16,
  },
  itemHead: {
    flexDirection: "row",
    marginBottom: 4,
  },
  itemNum: {
    width: 22,
    fontSize: 14,
    fontWeight: 700,
  },
  itemTopic: {
    flex: 1,
    fontSize: 14,
    fontWeight: 700,
  },
  metaRow: {
    flexDirection: "row",
    marginLeft: 22,
    marginBottom: 2,
  },
  metaLabel: {
    width: 110,
    fontSize: 12,
    color: MUTED,
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
  },
  decision: {
    marginLeft: 22,
    marginTop: 4,
    paddingLeft: 8,
    borderLeft: "1.5pt solid " + ACCENT,
  },
  decisionLabel: {
    fontSize: 13,
    fontWeight: 700,
  },
  decisionText: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    fontSize: 13,
    color: MUTED,
    fontStyle: "italic",
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

// Kengash turi — PDF faqat özbekça (task-document'dagi kabi serverda qattiq yoziladi).
const KIND_UZ: Record<string, string> = {
  ekspert: "Ekspertlar Kengashi",
  smeta: "Smeta Komissiyasi",
};

// Qaror holati — özbekça yorliqlar.
const DECISION_UZ: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Maʼqullandi",
  rejected: "Rad etildi",
  deferred: "Keyinga qoldirildi",
};

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  const x = new Date(d);
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${x.getFullYear()}`;
}

export async function buildCouncilProtocolPdf(meetingId: string): Promise<Buffer | null> {
  const meeting = await getMeetingForProtocol(meetingId);
  if (!meeting) return null;

  const kindLabel = KIND_UZ[meeting.kind] ?? meeting.kind;

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Tashkilot sarlavhasi */}
        <View style={s.header}>
          <Text style={s.orgName}>Bolalar Kontentini Rivojlantirish Markazi</Text>
          <Text style={s.orgSub}>Ichki Ijro Tizimi</Text>
        </View>
        <View style={s.divider} />

        {/* Hujjat sarlavhasi */}
        <Text style={s.title}>Bayonnoma</Text>
        <Text style={s.subtitle}>{kindLabel}</Text>
        <Text style={s.subtitle}>{fmt(meeting.scheduledAt)}</Text>
        {meeting.title && <Text style={s.meetingTitle}>{meeting.title}</Text>}

        {/* Kun tartibi va qarorlar */}
        <Text style={[s.sectionTitle, meeting.title ? {} : { marginTop: 20 }]}>Kun tartibi va qarorlar</Text>
        {meeting.items.length === 0 ? (
          <Text style={s.empty}>Kun tartibi boʻsh</Text>
        ) : (
          meeting.items.map((it, i) => (
            <View key={i} style={s.item} wrap={false}>
              <View style={s.itemHead}>
                <Text style={s.itemNum}>{i + 1}.</Text>
                <Text style={s.itemTopic}>{it.topic}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Loyiha:</Text>
                <Text style={s.metaValue}>{it.projectName ?? "—"}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Maʼruzachi:</Text>
                <Text style={s.metaValue}>{it.presenterName ?? "—"}</Text>
              </View>
              <View style={s.decision}>
                <Text style={s.decisionLabel}>Qaror: {DECISION_UZ[it.decisionStatus] ?? it.decisionStatus}</Text>
                {it.decision && <Text style={s.decisionText}>{it.decision}</Text>}
              </View>
            </View>
          ))
        )}

        {/* Muhrli pastki qism */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerText}>{kindLabel}</Text>
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
