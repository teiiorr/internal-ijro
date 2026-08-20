import "server-only";
import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, employeeProfiles, positionHistory, users } from "@/lib/db/schema";
import { registerMontserrat } from "@/lib/pdf/fonts";
import { shortName } from "@/lib/names";

registerMontserrat();

const FONT = "Times New Roman";
const MUTED = "#444444";

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 72,
    fontSize: 14,
    fontFamily: FONT,
    color: "#000000",
    lineHeight: 1.5,
  },
  h1: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    marginBottom: 20,
  },
  divider: {
    borderBottom: "1pt solid #000000",
    marginBottom: 16,
  },
  h2: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 6,
    borderBottom: "0.5pt solid #CCCCCC",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 170,
    fontSize: 14,
    color: MUTED,
  },
  value: {
    flex: 1,
    fontSize: 14,
  },
  small: {
    color: MUTED,
    fontSize: 12,
  },
});

export async function buildEmployeeCardPdf(userId: string): Promise<Buffer | null> {
  const rows = await db
    .select({ user: users, profile: employeeProfiles, department: departments })
    .from(users)
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.id, userId))
    .limit(1);
  if (rows.length === 0) return null;
  const { user, profile, department } = rows[0];
  const history = await db
    .select()
    .from(positionHistory)
    .where(eq(positionHistory.userId, userId))
    .orderBy(positionHistory.changeDate);

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || "—"}</Text>
    </View>
  );

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{shortName(user.fullName)}</Text>
        <Text style={s.subtitle}>
          {user.email} · {department?.name ?? "—"} · {user.position}
        </Text>
        <View style={s.divider} />

        <Text style={s.h2}>Shaxsiy ma'lumotlar</Text>
        <Field label="Telefon" value={user.phone} />
        <Field label="Tug'ilgan sana" value={profile?.birthDate ?? null} />
        <Field label="Oilaviy holati" value={profile?.maritalStatus ?? null} />
        <Field label="Manzil" value={profile?.address ?? null} />

        <Text style={s.h2}>Pasport</Text>
        <Field label="Seriya / raqam" value={[profile?.passportSerial, profile?.passportNumber].filter(Boolean).join(" ") || null} />
        <Field label="Kim tomonidan berilgan" value={profile?.passportIssuedBy ?? null} />
        <Field label="Berilgan sana" value={profile?.passportIssuedDate ?? null} />
        <Field label="INN" value={profile?.inn ?? null} />

        <Text style={s.h2}>Favqulodda aloqa</Text>
        <Field label="Ism" value={profile?.emergencyContactName ?? null} />
        <Field label="Telefon" value={profile?.emergencyContactPhone ?? null} />
        <Field label="Qarindoshlik" value={profile?.emergencyContactRelation ?? null} />

        <Text style={s.h2}>Ish faoliyati</Text>
        <Field label="Ishga kirgan sana" value={user.hireDate} />
        <Field label="Holati" value={user.status} />
        <Field label="Bo'shatilgan sana" value={user.terminationDate} />

        <Text style={s.h2}>Lavozim tarixi</Text>
        {history.length === 0 ? (
          <Text style={s.small}>O'zgarishlar qayd etilmagan.</Text>
        ) : (
          history.map((h) => (
            <Text key={h.id} style={{ fontSize: 13, marginBottom: 2 }}>
              {new Date(h.changeDate).toISOString().slice(0, 10)} · {h.oldPosition ?? "—"} → {h.newPosition}{h.reason ? ` (${h.reason})` : ""}
            </Text>
          ))
        )}

        {profile?.notesHr && (
          <>
            <Text style={s.h2}>HR eslatmalari</Text>
            <Text style={{ fontSize: 14 }}>{profile.notesHr}</Text>
          </>
        )}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
