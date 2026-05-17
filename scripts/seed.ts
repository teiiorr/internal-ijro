import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema });

  const exists = await db.select().from(schema.users).limit(1);
  if (exists.length > 0) {
    console.log("Database already has users. Aborting seed.");
    await sql.end();
    return;
  }

  const hash = await bcrypt.hash("Password123!", 12);

  // 1 Direktor
  const [direktor] = await db
    .insert(schema.users)
    .values({
      email: "direktor@bkrm.local",
      passwordHash: hash,
      fullName: "Direktor Demo",
      position: "direktor",
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: schema.users.id });
  await db.insert(schema.notificationSettings).values({ userId: direktor.id });

  // 2 departments
  const [d1] = await db.insert(schema.departments).values({ name: "Content", nameRu: "Контент" }).returning({ id: schema.departments.id });
  const [d2] = await db.insert(schema.departments).values({ name: "Engineering", nameRu: "Инженерия" }).returning({ id: schema.departments.id });

  // Update direktor with departments? Direktor isn't tied to dept usually. Skip.

  // 1 HR
  const [hr] = await db.insert(schema.users).values({
    email: "hr@bkrm.local", passwordHash: hash, fullName: "HR Demo", position: "hr", status: "active", emailVerifiedAt: new Date(),
  }).returning({ id: schema.users.id });
  await db.insert(schema.notificationSettings).values({ userId: hr.id });

  // 1 koordinator
  const [koord] = await db.insert(schema.users).values({
    email: "koordinator@bkrm.local", passwordHash: hash, fullName: "Koordinator Demo",
    position: "koordinator", status: "active", emailVerifiedAt: new Date(), reportsToUserId: direktor.id,
  }).returning({ id: schema.users.id });
  await db.insert(schema.notificationSettings).values({ userId: koord.id });
  await db.insert(schema.coordinatorAssignments).values([{ coordinatorUserId: koord.id, departmentId: d1.id }, { coordinatorUserId: koord.id, departmentId: d2.id }]);

  // 1 bolim_boshligi
  const [bb] = await db.insert(schema.users).values({
    email: "boshlik@bkrm.local", passwordHash: hash, fullName: "Bolim Boshlig'i Demo",
    position: "bolim_boshligi", status: "active", emailVerifiedAt: new Date(), departmentId: d1.id, reportsToUserId: koord.id,
  }).returning({ id: schema.users.id });
  await db.insert(schema.notificationSettings).values({ userId: bb.id });
  await db.update(schema.departments).set({ headUserId: bb.id }).where(eq(schema.departments.id, d1.id));

  // 2 mutaxassis
  const [m1] = await db.insert(schema.users).values({
    email: "spec1@bkrm.local", passwordHash: hash, fullName: "Spec One",
    position: "mutaxassis", status: "active", emailVerifiedAt: new Date(), departmentId: d1.id, reportsToUserId: bb.id, hireDate: "2024-01-15",
  }).returning({ id: schema.users.id });
  const [m2] = await db.insert(schema.users).values({
    email: "spec2@bkrm.local", passwordHash: hash, fullName: "Spec Two",
    position: "mutaxassis", status: "active", emailVerifiedAt: new Date(), departmentId: d2.id, hireDate: "2024-05-01",
  }).returning({ id: schema.users.id });
  await db.insert(schema.notificationSettings).values([{ userId: m1.id }, { userId: m2.id }]);

  // 1 contractor
  const [c1] = await db.insert(schema.externalCompanies).values({
    name: "ACME Studio", contactPerson: "John Contractor", contactEmail: "contractor@example.com", status: "approved", approvedByUserId: direktor.id, approvedAt: new Date(),
  }).returning({ id: schema.externalCompanies.id });
  const [cu] = await db.insert(schema.users).values({
    email: "contractor@example.com", passwordHash: hash, fullName: "John Contractor",
    position: "kontragent", status: "active", emailVerifiedAt: new Date(),
  }).returning({ id: schema.users.id });
  await db.insert(schema.notificationSettings).values({ userId: cu.id });

  // 1 project + 2 milestones + 2 tasks
  const [prj] = await db.insert(schema.projects).values({
    name: "Demo external project", type: "external", externalCompanyId: c1.id, curatorUserId: koord.id, createdByUserId: direktor.id, status: "in_progress", deadline: "2026-12-31",
  }).returning({ id: schema.projects.id });
  await db.insert(schema.milestones).values([
    { projectId: prj.id, title: "Design phase", weight: 1, paymentAmount: "1000.00" },
    { projectId: prj.id, title: "Build phase", weight: 2, paymentAmount: "2000.00", orderIndex: 1 },
  ]);
  await db.insert(schema.tasks).values([
    { title: "Write spec", assignedToUserId: m1.id, createdByUserId: bb.id, projectId: prj.id, priority: "high", deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { title: "Build prototype", assignedToUserId: m2.id, createdByUserId: koord.id, projectId: prj.id, priority: "medium", deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  ]);

  console.log("Seed complete.");
  console.log("Login emails (password Password123!): direktor@bkrm.local, hr@bkrm.local, koordinator@bkrm.local, boshlik@bkrm.local, spec1@bkrm.local, spec2@bkrm.local, contractor@example.com");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
