import "server-only";
import type { ReactNode } from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { registerMontserrat } from "@/lib/pdf/fonts";
import {
  DOC_TYPE_LABEL_UZ,
  POSITION_LABEL_UZ,
  formatTashkentDateTime,
  ymdToDots,
} from "@/components/staff/normative-ack/logic";
import type { AckRequestDetail } from "@/server/queries/normative-ack";

registerMontserrat();

const FONT = "Times New Roman";
const INK = "#000000";
const MUTED = "#444444";
const LINE = "0.75pt solid #000000";

// Column widths (A4 portrait, 40pt side margins → ~515pt of content).
const W = { num: 26, name: 130, position: 100, dept: 100, date: 84, sign: 75 };

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: FONT,
    color: INK,
    // No lineHeight here: a page-level lineHeight hides the absolutely positioned fixed footer (react-pdf quirk).
  },
  org: { fontSize: 11, fontWeight: 700, textAlign: "center", textTransform: "uppercase" },
  divider: { borderBottom: "1.2pt solid #000000", marginTop: 6, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", letterSpacing: 1.5, marginBottom: 14 },
  infoRow: { flexDirection: "row", marginBottom: 5 },
  infoLabel: { width: 150, fontWeight: 700 },
  infoValue: { flex: 1 },
  table: { marginTop: 14 },
  // Every row draws its own full frame and overlaps the previous row's bottom line by
  // -0.75pt, so a row that starts a new page still gets its top border.
  row: { flexDirection: "row", minHeight: 28, borderTop: LINE, borderBottom: LINE, borderLeft: LINE, marginTop: -0.75 },
  headRow: { flexDirection: "row", borderTop: LINE, borderBottom: LINE, borderLeft: LINE, backgroundColor: "#EFEFEF" },
  cell: { borderRight: LINE, paddingVertical: 4, paddingHorizontal: 4, justifyContent: "center" },
  headText: { fontSize: 10, fontWeight: 700, textAlign: "center" },
  bodyText: { fontSize: 10.5 },
  smallText: { fontSize: 9.5, color: MUTED },
  closing: { marginTop: 26, flexDirection: "row", justifyContent: "space-between" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: MUTED,
  },
});

/** Names and titles must never be hyphenated ("Al-isher"). */
const noHyphen = (word: string) => [word];

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} hyphenationCallback={noHyphen}>{value}</Text>
    </View>
  );
}

function Cell({ width, children, center }: { width: number; children?: ReactNode; center?: boolean }) {
  return <View style={[s.cell, { width }, center ? { alignItems: "center" } : {}]}>{children}</View>;
}

/** Printable "Tanishtirish varaqasi" (Times New Roman) with an empty signature column. */
export async function renderAckSheet(detail: AckRequestDetail): Promise<Buffer> {
  const { request, document, meta, recipients } = detail;
  const printedAt = formatTashkentDateTime(new Date());
  const docNumber = meta?.docNumber ? `№ ${meta.docNumber}` : null;

  const doc = (
    <Document title={`Tanishtirish varaqasi — ${document.fileName}`} author="Ichki Ijro">
      <Page size="A4" style={s.page}>
        <Text style={s.org}>Bolalar Kontentini Rivojlantirish Markazi</Text>
        <View style={s.divider} />

        <Text style={s.title}>TANISHTIRISH VARAQASI</Text>

        <Info label="Hujjat turi:" value={meta?.docType ? DOC_TYPE_LABEL_UZ[meta.docType] : null} />
        <Info label="Raqami:" value={docNumber} />
        <Info label="Sanasi:" value={meta?.docDate ? ymdToDots(meta.docDate) : null} />
        <Info label="Hujjat nomi:" value={document.fileName} />
        <Info label="Qabul qilgan organ:" value={meta?.issuedBy} />
        <Info label="Tanishtirish muddati:" value={ymdToDots(request.deadline)} />
        <Info label="Yuborgan:" value={request.requestedByName} />

        <View style={s.table}>
          <View style={s.headRow} wrap={false}>
            <Cell width={W.num} center><Text style={s.headText}>№</Text></Cell>
            <Cell width={W.name}><Text style={s.headText}>F.I.Sh.</Text></Cell>
            <Cell width={W.position}><Text style={s.headText}>Lavozimi</Text></Cell>
            <Cell width={W.dept}><Text style={s.headText}>Boʻlim</Text></Cell>
            <Cell width={W.date}><Text style={s.headText} hyphenationCallback={noHyphen}>Tanishgan sana va vaqt</Text></Cell>
            <Cell width={W.sign}><Text style={s.headText}>Imzo</Text></Cell>
          </View>
          {recipients.map((p, i) => (
            <View key={p.userId} style={s.row} wrap={false}>
              <Cell width={W.num} center><Text style={s.bodyText}>{i + 1}</Text></Cell>
              <Cell width={W.name}><Text style={s.bodyText} hyphenationCallback={noHyphen}>{p.fullName}</Text></Cell>
              <Cell width={W.position}>
                <Text style={s.bodyText} hyphenationCallback={noHyphen}>
                  {p.positionTitle?.trim() || POSITION_LABEL_UZ[p.position] || p.position}
                </Text>
              </Cell>
              <Cell width={W.dept}><Text style={s.smallText} hyphenationCallback={noHyphen}>{p.departmentName ?? ""}</Text></Cell>
              <Cell width={W.date} center>
                <Text style={s.bodyText}>{formatTashkentDateTime(p.acknowledgedAt)}</Text>
              </Cell>
              <Cell width={W.sign} />
            </View>
          ))}
        </View>

        <View style={s.closing} wrap={false}>
          <Text>Masʼul: ______________________________</Text>
          <Text>Sana: {printedAt.slice(0, 10)}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text>Chop etilgan: {printedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
