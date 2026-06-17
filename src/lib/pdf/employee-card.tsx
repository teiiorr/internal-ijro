import "server-only";
import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, employeeProfiles, positionHistory, users } from "@/lib/db/schema";
import { registerMontserrat } from "@/lib/pdf/fonts";

registerMontserrat();

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Montserrat" },
  h1: { fontSize: 20, marginBottom: 12 },
  h2: { fontSize: 13, marginTop: 14, marginBottom: 4, color: "#1A1A1A" },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 130, color: "#6B7280" },
  value: { flex: 1 },
  small: { color: "#6B7280", fontSize: 9 },
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
        <Text style={s.h1}>{user.fullName}</Text>
        <Text style={s.small}>{user.email} · {department?.name ?? "—"} · {user.position}</Text>

        <Text style={s.h2}>Personal</Text>
        <Field label="Phone" value={user.phone} />
        <Field label="Birth date" value={profile?.birthDate ?? null} />
        <Field label="Marital status" value={profile?.maritalStatus ?? null} />
        <Field label="Address" value={profile?.address ?? null} />

        <Text style={s.h2}>Passport</Text>
        <Field label="Serial / number" value={[profile?.passportSerial, profile?.passportNumber].filter(Boolean).join(" ") || null} />
        <Field label="Issued by" value={profile?.passportIssuedBy ?? null} />
        <Field label="Issued date" value={profile?.passportIssuedDate ?? null} />
        <Field label="INN" value={profile?.inn ?? null} />

        <Text style={s.h2}>Emergency contact</Text>
        <Field label="Name" value={profile?.emergencyContactName ?? null} />
        <Field label="Phone" value={profile?.emergencyContactPhone ?? null} />
        <Field label="Relation" value={profile?.emergencyContactRelation ?? null} />

        <Text style={s.h2}>Employment</Text>
        <Field label="Hire date" value={user.hireDate} />
        <Field label="Status" value={user.status} />
        <Field label="Termination" value={user.terminationDate} />

        <Text style={s.h2}>Position history</Text>
        {history.length === 0 ? (
          <Text style={s.small}>No changes recorded.</Text>
        ) : (
          history.map((h) => (
            <Text key={h.id} style={{ fontSize: 10, marginBottom: 2 }}>
              {new Date(h.changeDate).toISOString().slice(0, 10)} · {h.oldPosition ?? "—"} → {h.newPosition}{h.reason ? ` (${h.reason})` : ""}
            </Text>
          ))
        )}

        {profile?.notesHr && (
          <>
            <Text style={s.h2}>HR notes</Text>
            <Text>{profile.notesHr}</Text>
          </>
        )}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
