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

  const PASSWORD = "Password123!";
  const hash = await bcrypt.hash(PASSWORD, 12);

  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  const daysAhead = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

  // -------------------- 1. DEPARTMENTS --------------------
  const departmentInputs = [
    { name: "Loyiha bo'limi", nameRu: "Отдел проектов" },
    { name: "Eksklyuziv loyiha va tahlil bo'limi", nameRu: "Отдел эксклюзивных проектов и анализа" },
    { name: "Ishlab chiqarish bo'limi", nameRu: "Производственный отдел" },
    { name: "Xo'jalik bo'limi", nameRu: "Хозяйственный отдел" },
    { name: "Media va targ'ibot bo'limi", nameRu: "Отдел медиа и продвижения" },
  ];
  const depts = await db.insert(schema.departments).values(departmentInputs).returning({ id: schema.departments.id, name: schema.departments.name });
  const D = Object.fromEntries(depts.map((d) => [d.name, d.id])) as Record<string, string>;

  // -------------------- 2. USERS --------------------
  type UserInput = {
    key: string;
    fullName: string;
    email: string;
    position: schema.Position;
    departmentName?: string;
    reportsToKey?: string;
    hireDate?: string;
  };

  const userInputs: UserInput[] = [
    { key: "ahmedov", fullName: "Ahmedov Jahongir", email: "ahmedov.jahongir@bkrm.uz", position: "direktor", hireDate: "2020-01-10" },
    { key: "toshxojayev", fullName: "Toshxo'jayev Hasan", email: "toshxojayev.hasan@bkrm.uz", position: "orinbosar", reportsToKey: "ahmedov", hireDate: "2020-03-15" },
    { key: "kamilova", fullName: "Nargiza Kamilova", email: "kamilova.nargiza@bkrm.uz", position: "hr", reportsToKey: "ahmedov", hireDate: "2020-04-01" },
    { key: "ismatullayev", fullName: "Baxodir Ismatullayev", email: "ismatullayev.baxodir@bkrm.uz", position: "koordinator", reportsToKey: "toshxojayev", hireDate: "2020-06-20" },

    { key: "serobov", fullName: "Serobov Xurshid", email: "serobov.xurshid@bkrm.uz", position: "bolim_boshligi", departmentName: "Loyiha bo'limi", reportsToKey: "ismatullayev", hireDate: "2020-09-01" },
    { key: "bobomurodov", fullName: "Bobomurodov Shavkat", email: "bobomurodov.shavkat@bkrm.uz", position: "bolim_boshligi", departmentName: "Eksklyuziv loyiha va tahlil bo'limi", reportsToKey: "ismatullayev", hireDate: "2020-09-15" },
    { key: "mirzaliyev", fullName: "Mirzaliyev Muxtorjon", email: "mirzaliyev.muxtorjon@bkrm.uz", position: "bolim_boshligi", departmentName: "Ishlab chiqarish bo'limi", reportsToKey: "toshxojayev", hireDate: "2021-01-12" },
    { key: "abdumannopov", fullName: "Abdumannopov Farrux", email: "abdumannopov.farrux@bkrm.uz", position: "bolim_boshligi", departmentName: "Xo'jalik bo'limi", reportsToKey: "toshxojayev", hireDate: "2021-02-05" },
    { key: "yodgorov", fullName: "Yodgorov Shuhratjon", email: "yodgorov.shuhratjon@bkrm.uz", position: "bolim_boshligi", departmentName: "Media va targ'ibot bo'limi", reportsToKey: "ismatullayev", hireDate: "2021-03-22" },

    { key: "yoldashev", fullName: "Yo'ldashev Zafar", email: "yoldashev.zafar@bkrm.uz", position: "bosh_mutaxassis", departmentName: "Loyiha bo'limi", reportsToKey: "serobov", hireDate: "2021-05-10" },
    { key: "qurolov", fullName: "Qurolov G'ulomjon", email: "qurolov.gulomjon@bkrm.uz", position: "bosh_mutaxassis", departmentName: "Eksklyuziv loyiha va tahlil bo'limi", reportsToKey: "bobomurodov", hireDate: "2021-06-15" },
    { key: "toshtemirov", fullName: "Toshtemirov Akbar", email: "toshtemirov.akbar@bkrm.uz", position: "bosh_mutaxassis", departmentName: "Ishlab chiqarish bo'limi", reportsToKey: "mirzaliyev", hireDate: "2021-07-20" },
    { key: "madrahimov", fullName: "Madrahimov Alisher", email: "madrahimov.alisher@bkrm.uz", position: "bosh_mutaxassis", departmentName: "Xo'jalik bo'limi", reportsToKey: "abdumannopov", hireDate: "2021-08-15" },
    { key: "bosimov", fullName: "Bosimov O'rol", email: "bosimov.orol@bkrm.uz", position: "bosh_mutaxassis", departmentName: "Media va targ'ibot bo'limi", reportsToKey: "yodgorov", hireDate: "2021-09-10" },

    { key: "shermatov", fullName: "Shermatov Qobiljon", email: "shermatov.qobiljon@bkrm.uz", position: "yetakchi_mutaxassis", departmentName: "Loyiha bo'limi", reportsToKey: "yoldashev", hireDate: "2022-01-15" },
    { key: "mahkamov", fullName: "Mahkamov Mirjalol", email: "mahkamov.mirjalol@bkrm.uz", position: "yetakchi_mutaxassis", departmentName: "Eksklyuziv loyiha va tahlil bo'limi", reportsToKey: "qurolov", hireDate: "2022-02-10" },
    { key: "jumayev", fullName: "Jumayev Umarjon", email: "jumayev.umarjon@bkrm.uz", position: "yetakchi_mutaxassis", departmentName: "Ishlab chiqarish bo'limi", reportsToKey: "toshtemirov", hireDate: "2022-03-05" },
    { key: "axmedovj", fullName: "Axmedov Javlon", email: "axmedov.javlon@bkrm.uz", position: "yetakchi_mutaxassis", departmentName: "Xo'jalik bo'limi", reportsToKey: "madrahimov", hireDate: "2022-04-20" },
    { key: "matyakubov", fullName: "Matyakubov Aziz", email: "matyakubov.aziz@bkrm.uz", position: "yetakchi_mutaxassis", departmentName: "Media va targ'ibot bo'limi", reportsToKey: "bosimov", hireDate: "2022-05-12" },

    { key: "murodxojayev", fullName: "Murodxo'jayev Baxtiyorxo'ja", email: "murodxojayev.baxtiyorxoja@bkrm.uz", position: "mutaxassis", departmentName: "Loyiha bo'limi", reportsToKey: "shermatov", hireDate: "2022-08-01" },
    { key: "ilhamov", fullName: "Ilhamov Mahmudjon", email: "ilhamov.mahmudjon@bkrm.uz", position: "mutaxassis", departmentName: "Loyiha bo'limi", reportsToKey: "shermatov", hireDate: "2023-02-15" },
    { key: "shorakhmedov", fullName: "Sho'rakhmedov Nodir", email: "shorakhmedov.nodir@bkrm.uz", position: "mutaxassis", departmentName: "Eksklyuziv loyiha va tahlil bo'limi", reportsToKey: "mahkamov", hireDate: "2022-09-10" },
    { key: "odilxojayev", fullName: "Odilxo'jayev Zoxidxo'ja", email: "odilxojayev.zoxidxoja@bkrm.uz", position: "mutaxassis", departmentName: "Eksklyuziv loyiha va tahlil bo'limi", reportsToKey: "mahkamov", hireDate: "2023-04-20" },
    { key: "muxtorov", fullName: "Muxtorov Jamshid", email: "muxtorov.jamshid@bkrm.uz", position: "mutaxassis", departmentName: "Ishlab chiqarish bo'limi", reportsToKey: "jumayev", hireDate: "2022-11-15" },
    { key: "saidmurotov", fullName: "Saidmurotov Kamronbek", email: "saidmurotov.kamronbek@bkrm.uz", position: "mutaxassis", departmentName: "Ishlab chiqarish bo'limi", reportsToKey: "jumayev", hireDate: "2023-06-01" },
    { key: "saidkarimov", fullName: "Saidkarimov Asilxo'ja", email: "saidkarimov.asilxoja@bkrm.uz", position: "mutaxassis", departmentName: "Xo'jalik bo'limi", reportsToKey: "axmedovj", hireDate: "2022-12-10" },
    { key: "gaybullayev", fullName: "G'aybullayev To'xtasin", email: "gaybullayev.toxtasin@bkrm.uz", position: "mutaxassis", departmentName: "Media va targ'ibot bo'limi", reportsToKey: "matyakubov", hireDate: "2023-01-20" },
    { key: "mingboyev", fullName: "Mingboyev Sanjarbek", email: "mingboyev.sanjarbek@bkrm.uz", position: "mutaxassis", departmentName: "Media va targ'ibot bo'limi", reportsToKey: "matyakubov", hireDate: "2023-07-15" },
  ];

  const U: Record<string, string> = {};
  for (const u of userInputs) {
    const inserted = await db
      .insert(schema.users)
      .values({
        email: u.email,
        passwordHash: hash,
        fullName: u.fullName,
        position: u.position,
        departmentId: u.departmentName ? D[u.departmentName] : null,
        reportsToUserId: u.reportsToKey ? U[u.reportsToKey] : null,
        status: "active",
        emailVerifiedAt: new Date(),
        hireDate: u.hireDate ?? null,
        languagePreference: "uz-latn",
        themePreference: "system",
        timezone: "Asia/Tashkent",
      })
      .returning({ id: schema.users.id });
    U[u.key] = inserted[0].id;
    await db.insert(schema.notificationSettings).values({ userId: inserted[0].id });
  }

  await db.update(schema.departments).set({ headUserId: U["serobov"] }).where(eq(schema.departments.id, D["Loyiha bo'limi"]));
  await db.update(schema.departments).set({ headUserId: U["bobomurodov"] }).where(eq(schema.departments.id, D["Eksklyuziv loyiha va tahlil bo'limi"]));
  await db.update(schema.departments).set({ headUserId: U["mirzaliyev"] }).where(eq(schema.departments.id, D["Ishlab chiqarish bo'limi"]));
  await db.update(schema.departments).set({ headUserId: U["abdumannopov"] }).where(eq(schema.departments.id, D["Xo'jalik bo'limi"]));
  await db.update(schema.departments).set({ headUserId: U["yodgorov"] }).where(eq(schema.departments.id, D["Media va targ'ibot bo'limi"]));

  await db.insert(schema.coordinatorAssignments).values([
    { coordinatorUserId: U["ismatullayev"], departmentId: D["Loyiha bo'limi"] },
    { coordinatorUserId: U["ismatullayev"], departmentId: D["Eksklyuziv loyiha va tahlil bo'limi"] },
    { coordinatorUserId: U["ismatullayev"], departmentId: D["Media va targ'ibot bo'limi"] },
  ]);

  // -------------------- 3. CONTRACTORS --------------------
  const lola = await db.insert(schema.externalCompanies).values({
    name: "Lola Animation",
    contactPerson: "Azimjon Rahimjonov",
    contactEmail: "rahimjonov.azimjon@lolaanimation.uz",
    contactPhone: "+998 90 123 45 67",
    specialization: "Bolalar uchun animatsion seriallar va musiqiy klip ishlab chiqarish.",
    status: "approved",
    approvedByUserId: U["ahmedov"],
    approvedAt: daysAgo(120),
    ndaAcceptedAt: daysAgo(100),
  }).returning({ id: schema.externalCompanies.id });

  const bolalar = await db.insert(schema.externalCompanies).values({
    name: "Bolalar Production",
    contactPerson: "Ibroxim Axmedov",
    contactEmail: "axmedov.ibroxim@bolalarproduction.uz",
    contactPhone: "+998 91 234 56 78",
    specialization: "Hujjatli va o'quv filmlari, bolalar kontentini ishlab chiqarish.",
    status: "approved",
    approvedByUserId: U["toshxojayev"],
    approvedAt: daysAgo(95),
  }).returning({ id: schema.externalCompanies.id });

  const uzakov = await db.insert(schema.externalCompanies).values({
    name: "Uzakov Production",
    contactPerson: "Alisher Uzakov",
    contactEmail: "uzakov.alisher@uzakovproduction.uz",
    contactPhone: "+998 93 345 67 89",
    specialization: "TV-shoular va sport ko'rsatuvlari ishlab chiqarish.",
    status: "approved",
    approvedByUserId: U["ismatullayev"],
    approvedAt: daysAgo(80),
    ndaAcceptedAt: daysAgo(70),
  }).returning({ id: schema.externalCompanies.id });

  const contractorUsers = [
    { email: "rahimjonov.azimjon@lolaanimation.uz", fullName: "Azimjon Rahimjonov" },
    { email: "axmedov.ibroxim@bolalarproduction.uz", fullName: "Ibroxim Axmedov" },
    { email: "uzakov.alisher@uzakovproduction.uz", fullName: "Alisher Uzakov" },
  ];
  const C: Record<string, string> = {};
  for (const c of contractorUsers) {
    const ins = await db.insert(schema.users).values({
      email: c.email,
      passwordHash: hash,
      fullName: c.fullName,
      position: "kontragent",
      status: "active",
      emailVerifiedAt: new Date(),
      languagePreference: "uz-latn",
    }).returning({ id: schema.users.id });
    C[c.email] = ins[0].id;
    await db.insert(schema.notificationSettings).values({ userId: ins[0].id });
  }

  // -------------------- 4. PROJECTS --------------------
  const projYolbars = await db.insert(schema.projects).values({
    name: "Yo'lbars berar dars",
    description: "Bolalar uchun animatsion serial, har bir epizodda yo'lbars qahramon orqali tarbiyaviy darslar beriladi.",
    type: "external", externalCompanyId: lola[0].id, curatorUserId: U["bobomurodov"],
    status: "in_progress", startDate: dateOnly(daysAgo(90)), deadline: dateOnly(daysAhead(45)),
    budget: "150000000.00", budgetCurrency: "UZS", progressPercentage: 60, createdByUserId: U["toshxojayev"],
  }).returning({ id: schema.projects.id });

  const projChempion = await db.insert(schema.projects).values({
    name: "Chempion",
    description: "O'smirlar uchun motivatsion sport-shou. Mahalliy chempionlar haqida hujjatli sahnalar.",
    type: "external", externalCompanyId: uzakov[0].id, curatorUserId: U["bobomurodov"],
    status: "in_progress", startDate: dateOnly(daysAgo(60)), deadline: dateOnly(daysAhead(60)),
    budget: "80000000.00", budgetCurrency: "UZS", progressPercentage: 25, createdByUserId: U["ismatullayev"],
  }).returning({ id: schema.projects.id });

  const projBurro = await db.insert(schema.projects).values({
    name: "Burro",
    description: "Maktabgacha yoshdagi bolalar uchun qisqa metrajli animatsiya seriyasi.",
    type: "external", externalCompanyId: bolalar[0].id, curatorUserId: U["serobov"],
    status: "planning", startDate: dateOnly(daysAgo(20)), deadline: dateOnly(daysAhead(120)),
    budget: "50000000.00", budgetCurrency: "UZS", progressPercentage: 5, createdByUserId: U["toshxojayev"],
  }).returning({ id: schema.projects.id });

  const projSehrlandiya = await db.insert(schema.projects).values({
    name: "Sehrlandiya",
    description: "Sehrli olamga sayohat haqida animatsion teleserial.",
    type: "external", externalCompanyId: lola[0].id, curatorUserId: U["bobomurodov"],
    status: "completed", startDate: dateOnly(daysAgo(200)), deadline: dateOnly(daysAgo(15)),
    budget: "120000000.00", budgetCurrency: "UZS", progressPercentage: 100,
    completedAt: daysAgo(10), createdByUserId: U["ahmedov"],
  }).returning({ id: schema.projects.id });

  const projIchki = await db.insert(schema.projects).values({
    name: "Ichki Ijro platformasi",
    description: "Korxonaning ichki vazifa va kadrlar boshqaruvi tizimini ishlab chiqish.",
    type: "internal", curatorUserId: U["toshxojayev"],
    status: "in_progress", startDate: dateOnly(daysAgo(45)), deadline: dateOnly(daysAhead(30)),
    progressPercentage: 75, createdByUserId: U["ahmedov"],
  }).returning({ id: schema.projects.id });

  // -------------------- 5. MILESTONES --------------------
  const mYolbars = await db.insert(schema.milestones).values([
    { projectId: projYolbars[0].id, title: "Stsenariy tayyorlash", orderIndex: 0, weight: 1, deadline: dateOnly(daysAgo(60)), paymentAmount: "20000000.00", paymentStatus: "paid", status: "completed", completedAt: daysAgo(58) },
    { projectId: projYolbars[0].id, title: "Storyboard chizish", orderIndex: 1, weight: 2, deadline: dateOnly(daysAgo(30)), paymentAmount: "30000000.00", paymentStatus: "paid", status: "completed", completedAt: daysAgo(28) },
    { projectId: projYolbars[0].id, title: "Animatsiya yakuniy montaji", orderIndex: 2, weight: 3, deadline: dateOnly(daysAhead(20)), paymentAmount: "60000000.00", paymentStatus: "partial", status: "in_progress" },
    { projectId: projYolbars[0].id, title: "Ovoz va yakuniy render", orderIndex: 3, weight: 2, deadline: dateOnly(daysAhead(45)), paymentAmount: "40000000.00", paymentStatus: "pending", status: "pending" },
  ]).returning({ id: schema.milestones.id });

  const mChempion = await db.insert(schema.milestones).values([
    { projectId: projChempion[0].id, title: "Stsenariy va konseptsiya", orderIndex: 0, weight: 1, deadline: dateOnly(daysAhead(15)), paymentAmount: "15000000.00", paymentStatus: "pending", status: "in_progress" },
    { projectId: projChempion[0].id, title: "S'yomka", orderIndex: 1, weight: 2, deadline: dateOnly(daysAhead(35)), paymentAmount: "35000000.00", paymentStatus: "pending", status: "pending" },
    { projectId: projChempion[0].id, title: "Montaj va e'lon", orderIndex: 2, weight: 2, deadline: dateOnly(daysAhead(55)), paymentAmount: "30000000.00", paymentStatus: "pending", status: "pending" },
  ]).returning({ id: schema.milestones.id });

  await db.insert(schema.milestones).values([
    { projectId: projBurro[0].id, title: "Konseptual hujjat", orderIndex: 0, weight: 1, deadline: dateOnly(daysAhead(30)), paymentAmount: "10000000.00", paymentStatus: "pending", status: "in_progress" },
    { projectId: projBurro[0].id, title: "Stsenariy va personajlar", orderIndex: 1, weight: 2, deadline: dateOnly(daysAhead(60)), paymentAmount: "20000000.00", paymentStatus: "pending", status: "pending" },
    { projectId: projBurro[0].id, title: "Pilot epizod", orderIndex: 2, weight: 3, deadline: dateOnly(daysAhead(120)), paymentAmount: "20000000.00", paymentStatus: "pending", status: "pending" },
  ]);

  await db.insert(schema.milestones).values([
    { projectId: projSehrlandiya[0].id, title: "Stsenariy", orderIndex: 0, weight: 1, paymentAmount: "20000000.00", paymentStatus: "paid", status: "completed", completedAt: daysAgo(180) },
    { projectId: projSehrlandiya[0].id, title: "Storyboard", orderIndex: 1, weight: 2, paymentAmount: "30000000.00", paymentStatus: "paid", status: "completed", completedAt: daysAgo(140) },
    { projectId: projSehrlandiya[0].id, title: "Animatsiya", orderIndex: 2, weight: 3, paymentAmount: "50000000.00", paymentStatus: "paid", status: "completed", completedAt: daysAgo(40) },
    { projectId: projSehrlandiya[0].id, title: "Yakuniy montaj va etkazib berish", orderIndex: 3, weight: 2, paymentAmount: "20000000.00", paymentStatus: "paid", status: "completed", completedAt: daysAgo(15) },
  ]);

  await db.insert(schema.milestones).values([
    { projectId: projIchki[0].id, title: "Asosiy modullar (auth, HR, vazifalar)", orderIndex: 0, weight: 3, status: "completed", completedAt: daysAgo(20) },
    { projectId: projIchki[0].id, title: "Loyihalar va pudratchi portali", orderIndex: 1, weight: 2, status: "completed", completedAt: daysAgo(10) },
    { projectId: projIchki[0].id, title: "Telegram, audit, hisobotlar", orderIndex: 2, weight: 2, status: "in_progress" },
    { projectId: projIchki[0].id, title: "Yakuniy testlash va hujjatlash", orderIndex: 3, weight: 1, status: "pending", deadline: dateOnly(daysAhead(20)) },
  ]);

  await db.insert(schema.ratings).values({
    projectId: projSehrlandiya[0].id,
    externalCompanyId: lola[0].id,
    ratedByUserId: U["bobomurodov"],
    score: 5,
    notes: "Vaqtida yetkazib berildi, sifat yuqori darajada. Tavsiya etiladi.",
  });
  await db.update(schema.externalCompanies).set({ rating: "5.00" }).where(eq(schema.externalCompanies.id, lola[0].id));

  // -------------------- 6. TASKS --------------------
  type TaskInput = {
    key?: string;
    title: string;
    description?: string;
    projectKey?: "yolbars" | "chempion" | "burro" | "sehr" | "ichki";
    assignee: string;
    creator: string;
    status?: "todo" | "in_progress" | "under_review" | "completed" | "rejected";
    priority?: "low" | "medium" | "high" | "urgent";
    deadline?: Date | null;
    rejectionReason?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    completedAt?: Date | null;
  };

  const projMap = {
    yolbars: projYolbars[0].id,
    chempion: projChempion[0].id,
    burro: projBurro[0].id,
    sehr: projSehrlandiya[0].id,
    ichki: projIchki[0].id,
  } as const;

  const taskInputs: TaskInput[] = [
    { key: "t1", title: "Stsenariy yakuniy versiyasi", projectKey: "yolbars", assignee: "shorakhmedov", creator: "bobomurodov", status: "completed", priority: "high", deadline: daysAgo(60), completedAt: daysAgo(62) },
    { key: "t2", title: "Storyboard chizish", projectKey: "yolbars", assignee: "odilxojayev", creator: "bobomurodov", status: "completed", priority: "high", deadline: daysAgo(30), completedAt: daysAgo(28) },
    { key: "t3", title: "Animatsiya yakuniy montaji", projectKey: "yolbars", assignee: "saidmurotov", creator: "mirzaliyev", status: "in_progress", priority: "urgent", deadline: daysAhead(20) },
    { key: "t4", title: "Ovoz yozish va sozlash", projectKey: "yolbars", assignee: "muxtorov", creator: "mirzaliyev", status: "todo", priority: "high", deadline: daysAhead(30) },
    { key: "t5", title: "Yakuniy montaj va render", projectKey: "yolbars", assignee: "muxtorov", creator: "mirzaliyev", status: "todo", priority: "high", deadline: daysAhead(45) },
    { key: "t6", title: "Stsenariy konsepsiyasini tasdiqlash", projectKey: "chempion", assignee: "shorakhmedov", creator: "bobomurodov", status: "under_review", priority: "high", deadline: daysAhead(10) },
    { key: "t7", title: "Aktyorlar bilan kasting", projectKey: "chempion", assignee: "mingboyev", creator: "yodgorov", status: "todo", priority: "medium", deadline: daysAhead(20) },
    { key: "t8", title: "S'yomka jadvali", projectKey: "chempion", assignee: "saidmurotov", creator: "mirzaliyev", status: "in_progress", priority: "high", deadline: daysAhead(25) },
    { key: "t9", title: "Ijtimoiy tarmoqlar uchun anons", projectKey: "chempion", assignee: "gaybullayev", creator: "yodgorov", status: "todo", priority: "high", deadline: daysAhead(15) },
    { key: "t10", title: "Konseptual hujjat tayyorlash", projectKey: "burro", assignee: "mahkamov", creator: "bobomurodov", status: "in_progress", priority: "medium", deadline: daysAhead(30) },
    { key: "t11", title: "Bozor tahlilini o'tkazish", projectKey: "burro", assignee: "shorakhmedov", creator: "mahkamov", status: "todo", priority: "medium", deadline: daysAhead(40) },
    { key: "t12", title: "Yakuniy hisobot va arxivlash", projectKey: "sehr", assignee: "mahkamov", creator: "bobomurodov", status: "completed", priority: "medium", completedAt: daysAgo(12) },
    { key: "t13", title: "Audit log moduli yakunlash", projectKey: "ichki", assignee: "murodxojayev", creator: "toshxojayev", status: "in_progress", priority: "urgent", deadline: daysAhead(7) },
    { key: "t14", title: "Hisobotlar moduli sifat tekshiruvi", projectKey: "ichki", assignee: "ilhamov", creator: "serobov", status: "under_review", priority: "high", deadline: daysAhead(10) },
    { key: "t15", title: "Telegram bot integratsiyasi", projectKey: "ichki", assignee: "murodxojayev", creator: "serobov", status: "completed", priority: "high", completedAt: daysAgo(5) },
    { title: "Xodimlar reestrini yangilash", assignee: "ilhamov", creator: "ismatullayev", status: "in_progress", priority: "medium", deadline: daysAhead(14) },
    { title: "Idoradagi printerlarni almashtirish", assignee: "saidkarimov", creator: "abdumannopov", status: "completed", priority: "low", completedAt: daysAgo(3) },
    { title: "Yangi ofis jihozlash", assignee: "saidkarimov", creator: "abdumannopov", status: "in_progress", priority: "medium", deadline: daysAhead(21) },
    { title: "Korporativ saytda yangiliklar yangilash", assignee: "gaybullayev", creator: "bosimov", status: "in_progress", priority: "low", deadline: daysAhead(7) },
    { title: "Sotsial tarmoqlarda kontent rejasi", assignee: "mingboyev", creator: "matyakubov", status: "todo", priority: "high", deadline: daysAhead(5) },
    { title: "Haftalik standup uchrashuvi", assignee: "yoldashev", creator: "serobov", status: "todo", priority: "medium", isRecurring: true, recurrenceRule: "weekly", deadline: daysAhead(2) },
    { title: "Oylik moliyaviy hisobot", assignee: "madrahimov", creator: "abdumannopov", status: "todo", priority: "high", isRecurring: true, recurrenceRule: "monthly", deadline: daysAhead(10) },
    { title: "Eskirgan asboblar inventarizatsiyasi", assignee: "saidkarimov", creator: "abdumannopov", status: "todo", priority: "medium", deadline: daysAgo(5) },
    { title: "Soliq deklaratsiyasi topshirish", assignee: "madrahimov", creator: "abdumannopov", status: "in_progress", priority: "urgent", deadline: daysAhead(3) },
    { title: "Reklama bannerini yangilash", assignee: "mingboyev", creator: "yodgorov", status: "rejected", priority: "medium", rejectionReason: "Logotip kerakli o'lchamda emas, qayta tayyorlash kerak.", deadline: daysAhead(5) },
  ];

  const T: Record<string, string> = {};
  for (const t of taskInputs) {
    const ins = await db.insert(schema.tasks).values({
      title: t.title,
      description: t.description ?? null,
      projectId: t.projectKey ? projMap[t.projectKey] : null,
      assignedToUserId: U[t.assignee],
      createdByUserId: U[t.creator],
      status: t.status ?? "todo",
      priority: t.priority ?? "medium",
      deadline: t.deadline ?? null,
      rejectionReason: t.rejectionReason ?? null,
      isRecurring: t.isRecurring ?? false,
      recurrenceRule: t.recurrenceRule ?? null,
      completedAt: t.completedAt ?? null,
    }).returning({ id: schema.tasks.id });
    if (t.key) T[t.key] = ins[0].id;
  }

  // -------------------- 7. DEPENDENCIES --------------------
  await db.insert(schema.taskDependencies).values([
    { taskId: T["t2"], dependsOnTaskId: T["t1"] },
    { taskId: T["t3"], dependsOnTaskId: T["t2"] },
    { taskId: T["t4"], dependsOnTaskId: T["t3"] },
    { taskId: T["t5"], dependsOnTaskId: T["t4"] },
    { taskId: T["t11"], dependsOnTaskId: T["t10"] },
  ]);

  // -------------------- 8. CHECKLIST --------------------
  await db.insert(schema.taskChecklistItems).values([
    { taskId: T["t7"], content: "10 nomzodni tanlash", isCompleted: true, orderIndex: 0, completedAt: daysAgo(3) },
    { taskId: T["t7"], content: "Skreening uchrashuvi", isCompleted: true, orderIndex: 1, completedAt: daysAgo(1) },
    { taskId: T["t7"], content: "Yakuniy 3 nomzodni belgilash", orderIndex: 2 },
    { taskId: T["t7"], content: "Hujjatlarni rasmiylashtirish", orderIndex: 3 },
    { taskId: T["t13"], content: "Audit log filtrlar", isCompleted: true, orderIndex: 0, completedAt: daysAgo(2) },
    { taskId: T["t13"], content: "Excel eksport", isCompleted: true, orderIndex: 1, completedAt: daysAgo(1) },
    { taskId: T["t13"], content: "Polnotekstovыy poisk", orderIndex: 2 },
    { taskId: T["t13"], content: "UI filtr-bar", orderIndex: 3 },
    { taskId: T["t10"], content: "Personajlar tavsifi", isCompleted: true, orderIndex: 0, completedAt: daysAgo(5) },
    { taskId: T["t10"], content: "Maqsadli auditoriya tahlili", orderIndex: 1 },
    { taskId: T["t10"], content: "Konsept hujjatini yakunlash", orderIndex: 2 },
  ]);

  // -------------------- 9. COMMENTS --------------------
  await db.insert(schema.taskComments).values([
    { taskId: T["t3"], userId: U["bobomurodov"], content: '@"Mirzaliyev Muxtorjon" Animatsiya jarayonida storyboarddan og\'ish bo\'lmasin, har bir kadrni tekshirib turing.', mentions: [U["mirzaliyev"]] },
    { taskId: T["t3"], userId: U["mirzaliyev"], content: "Tushunarli, qat'iy nazorat ostida. Haftalik koordinatsiya o'tkazyapmiz." },
    { taskId: T["t13"], userId: U["murodxojayev"], content: "Permission matrix tekshirildi, canAssignTaskTo to'g'ri ishlayapti. Vitest: 16/16." },
    { taskId: T["t13"], userId: U["toshxojayev"], content: '@"Murodxo\'jayev Baxtiyorxo\'ja" Excel eksportini ham audit logga qo\'shing iltimos.', mentions: [U["murodxojayev"]] },
    { taskId: T["t6"], userId: U["bobomurodov"], content: "Sahna 4 va 7 ni qayta ko'rib chiqish kerak, mantiq buzilgan." },
  ]);

  // -------------------- 10. WATCHERS --------------------
  await db.insert(schema.taskWatchers).values([
    { taskId: T["t13"], userId: U["ahmedov"] },
    { taskId: T["t13"], userId: U["toshxojayev"] },
    { taskId: T["t3"], userId: U["ismatullayev"] },
  ]);

  // -------------------- 11. EMPLOYEE PROFILES --------------------
  await db.insert(schema.employeeProfiles).values([
    { userId: U["ahmedov"], birthDate: "1972-04-15", passportSerial: "AA", passportNumber: "1234567", passportIssuedBy: "Toshkent shahar IIB", passportIssuedDate: "2015-04-10", inn: "301234567890", address: "Toshkent shahar, Yunusobod tumani, Bobur ko'chasi 12", emergencyContactName: "Ahmedova Munira", emergencyContactPhone: "+998 90 111 22 33", emergencyContactRelation: "Rafiqa", maritalStatus: "Uylangan", education: "Toshkent davlat universiteti, jurnalistika, 1995" },
    { userId: U["toshxojayev"], birthDate: "1978-09-22", passportSerial: "AB", passportNumber: "2345678", inn: "302345678901", address: "Toshkent shahar, Mirzo Ulug'bek tumani", emergencyContactName: "Toshxo'jayeva Nilufar", emergencyContactPhone: "+998 91 222 33 44", emergencyContactRelation: "Rafiqa", maritalStatus: "Uylangan", education: "O'zMU, iqtisod, 2000" },
    { userId: U["kamilova"], birthDate: "1985-01-30", passportSerial: "AC", passportNumber: "3456789", inn: "303456789012", address: "Toshkent shahar, Shayxontohur tumani", emergencyContactName: "Kamilov Otabek", emergencyContactRelation: "Aka", maritalStatus: "Uylanmagan", education: "TDPU, psixologiya, 2007" },
    { userId: U["murodxojayev"], birthDate: "1995-06-12", passportSerial: "AD", passportNumber: "4567890", inn: "304567890123", address: "Toshkent shahar, Chilonzor tumani", emergencyContactName: "Murodxo'jayev Doniyorxo'ja", emergencyContactRelation: "Otasi", maritalStatus: "Uylanmagan", education: "Inha University, IT, 2018", notesHr: "Yuqori malakali dasturchi, Ichki Ijro tizimi muallifi." },
    { userId: U["mirzaliyev"], birthDate: "1980-11-05", passportSerial: "AE", passportNumber: "5678901", inn: "305678901234", address: "Toshkent shahar, Yashnobod tumani", emergencyContactName: "Mirzaliyeva Gulnora", emergencyContactRelation: "Rafiqa", maritalStatus: "Uylangan", education: "TATU, axborot texnologiyalari, 2003" },
    { userId: U["bobomurodov"], birthDate: "1982-07-20", passportSerial: "AF", passportNumber: "6789012", inn: "306789012345", address: "Toshkent viloyati, Qibray tumani", emergencyContactName: "Bobomurodov Akmal", emergencyContactRelation: "Aka", maritalStatus: "Uylangan", education: "O'zDSMI, kino san'ati, 2005" },
    { userId: U["serobov"], birthDate: "1984-03-18", passportSerial: "AG", passportNumber: "7890123", inn: "307890123456", address: "Toshkent shahar, Sergeli tumani", emergencyContactName: "Serobova Mohira", emergencyContactRelation: "Rafiqa", maritalStatus: "Uylangan", education: "TDPU, menejment, 2006" },
    { userId: U["yodgorov"], birthDate: "1986-10-25", passportSerial: "AH", passportNumber: "8901234", inn: "308901234567", address: "Toshkent shahar, Olmazor tumani", emergencyContactName: "Yodgorova Madina", emergencyContactRelation: "Rafiqa", maritalStatus: "Uylangan", education: "O'zMU, marketing, 2008" },
  ]);

  // -------------------- 12. POSITION HISTORY --------------------
  await db.insert(schema.positionHistory).values([
    { userId: U["toshxojayev"], oldPosition: "bolim_boshligi", newPosition: "orinbosar", oldDepartmentId: D["Loyiha bo'limi"], newDepartmentId: null, changedByUserId: U["ahmedov"], reason: "Yuqori malaka va yetakchilik ko'nikmalari uchun ko'tarish.", changeDate: daysAgo(800) },
    { userId: U["mirzaliyev"], oldPosition: "bosh_mutaxassis", newPosition: "bolim_boshligi", oldDepartmentId: D["Ishlab chiqarish bo'limi"], newDepartmentId: D["Ishlab chiqarish bo'limi"], changedByUserId: U["toshxojayev"], reason: "Bo'lim boshqaruvi.", changeDate: daysAgo(600) },
    { userId: U["bobomurodov"], oldPosition: "koordinator", newPosition: "bolim_boshligi", oldDepartmentId: null, newDepartmentId: D["Eksklyuziv loyiha va tahlil bo'limi"], changedByUserId: U["toshxojayev"], reason: "Yangi bo'lim ochilishi munosabati bilan ko'chirish.", changeDate: daysAgo(500) },
    { userId: U["murodxojayev"], oldPosition: "yetakchi_mutaxassis", newPosition: "mutaxassis", oldDepartmentId: D["Loyiha bo'limi"], newDepartmentId: D["Loyiha bo'limi"], changedByUserId: U["serobov"], reason: "Texnik yo'nalishga to'liq o'tkazish.", changeDate: daysAgo(200) },
    { userId: U["shermatov"], oldPosition: "mutaxassis", newPosition: "yetakchi_mutaxassis", oldDepartmentId: D["Loyiha bo'limi"], newDepartmentId: D["Loyiha bo'limi"], changedByUserId: U["serobov"], reason: "Yuqori natijalar uchun ko'tarish.", changeDate: daysAgo(300) },
  ]);

  // -------------------- 13. STANDUP REPORTS --------------------
  const standupUsers = ["murodxojayev", "shorakhmedov", "mahkamov", "toshtemirov", "gaybullayev", "saidmurotov"];
  for (const key of standupUsers) {
    for (let i = 1; i <= 5; i++) {
      const reportDate = daysAgo(i);
      const dow = reportDate.getDay();
      if (dow === 0 || dow === 6) continue;
      await db.insert(schema.standupReports).values({
        userId: U[key],
        reportDate: dateOnly(reportDate),
        doneYesterday: "Topshiriqlar ro'yxatidagi vazifalar bajarildi, kerakli koordinatsiya o'tkazildi.",
        plannedToday: "Joriy vazifalarni davom ettirish, hisobotni tayyorlash.",
        blockers: i === 2 ? "Ba'zi tashqi ma'lumotlar kechikmoqda." : null,
      });
    }
  }

  // -------------------- 14. LEAVES --------------------
  await db.insert(schema.leaves).values([
    { userId: U["saidkarimov"], type: "vacation", startDate: dateOnly(daysAgo(60)), endDate: dateOnly(daysAgo(45)), reason: "Yillik mehnat ta'tili.", status: "approved", approvedByUserId: U["kamilova"], approvedAt: daysAgo(65) },
    { userId: U["murodxojayev"], type: "vacation", startDate: dateOnly(daysAhead(7)), endDate: dateOnly(daysAhead(14)), reason: "Rejalashtirilgan dam olish.", status: "approved", approvedByUserId: U["kamilova"], approvedAt: daysAgo(3) },
    { userId: U["shorakhmedov"], type: "sick", startDate: dateOnly(daysAgo(3)), endDate: dateOnly(daysAgo(1)), reason: "Tish davolash.", status: "approved", approvedByUserId: U["kamilova"], approvedAt: daysAgo(3) },
    { userId: U["jumayev"], type: "vacation", startDate: dateOnly(daysAhead(30)), endDate: dateOnly(daysAhead(40)), reason: "Oilaviy yo'l-yo'riq.", status: "pending" },
    { userId: U["mingboyev"], type: "unpaid", startDate: dateOnly(daysAhead(10)), endDate: dateOnly(daysAhead(15)), reason: "Shaxsiy ish.", status: "pending" },
    { userId: U["ilhamov"], type: "vacation", startDate: dateOnly(daysAgo(40)), endDate: dateOnly(daysAgo(35)), reason: "Sayohat.", status: "rejected", approvedByUserId: U["kamilova"], approvedAt: daysAgo(45), rejectionReason: "O'sha davrda muhim loyihalar jadvalda edi." },
  ]);

  // -------------------- 15. DELIVERABLES --------------------
  await db.insert(schema.deliverables).values([
    { milestoneId: mYolbars[1].id, submittedByUserId: C["rahimjonov.azimjon@lolaanimation.uz"], type: "document", fileUrl: "/api/files/deliverables/demo/storyboard-v3.pdf", fileName: "storyboard-v3.pdf", fileSize: 4200000, message: "Storyboardning yakuniy 3-versiyasi. Barcha tahrirlar kiritildi.", status: "approved", reviewedByUserId: U["bobomurodov"], reviewedAt: daysAgo(29), adminFeedback: "Sifat yaxshi, qabul qilindi.", submittedAt: daysAgo(30) },
    { milestoneId: mYolbars[2].id, submittedByUserId: C["rahimjonov.azimjon@lolaanimation.uz"], type: "video", fileUrl: "/api/files/deliverables/demo/animation-preview.mp4", fileName: "animation-preview.mp4", fileSize: 48000000, message: "Birinchi 3 epizodning animatsion versiyasi, sharhlar uchun.", status: "submitted", submittedAt: daysAgo(2) },
    { milestoneId: mChempion[0].id, submittedByUserId: C["uzakov.alisher@uzakovproduction.uz"], type: "document", fileUrl: "/api/files/deliverables/demo/chempion-script-v1.docx", fileName: "chempion-script-v1.docx", fileSize: 320000, message: "Stsenariyning birinchi to'liq versiyasi.", status: "revision_requested", reviewedByUserId: U["bobomurodov"], reviewedAt: daysAgo(1), adminFeedback: "Sahna 4 va 7 qayta ko'rib chiqilishi kerak, mantiq buzilgan.", submittedAt: daysAgo(3) },
    { milestoneId: mYolbars[0].id, submittedByUserId: C["rahimjonov.azimjon@lolaanimation.uz"], type: "document", fileUrl: "/api/files/deliverables/demo/yolbars-script-final.pdf", fileName: "yolbars-script-final.pdf", fileSize: 1800000, message: "Yakuniy tasdiqlangan stsenariy.", status: "approved", reviewedByUserId: U["bobomurodov"], reviewedAt: daysAgo(58), adminFeedback: "Tasdiqlandi.", submittedAt: daysAgo(60) },
  ]);

  // -------------------- 16. PROJECT MESSAGES --------------------
  await db.insert(schema.projectMessages).values([
    { projectId: projYolbars[0].id, userId: U["bobomurodov"], content: "Storyboard tayyor bo'lganida video formatda yuboring iltimos.", createdAt: daysAgo(35) },
    { projectId: projYolbars[0].id, userId: C["rahimjonov.azimjon@lolaanimation.uz"], content: "Tayyor, hisobot bilan birga yukladim.", createdAt: daysAgo(30) },
    { projectId: projYolbars[0].id, userId: U["bobomurodov"], content: "Rahmat, ko'rib chiqdik. Animatsiyaga o'tamiz.", createdAt: daysAgo(29) },
    { projectId: projYolbars[0].id, userId: C["rahimjonov.azimjon@lolaanimation.uz"], content: "Birinchi 3 epizodning preview versiyasini yukladim.", createdAt: daysAgo(2) },
    { projectId: projChempion[0].id, userId: U["bobomurodov"], content: "Stsenariyda 3 ta sahna qayta ko'rib chiqilishi kerak.", createdAt: daysAgo(1) },
    { projectId: projChempion[0].id, userId: C["uzakov.alisher@uzakovproduction.uz"], content: "Tushundim, dushanbagacha tahrirlangan versiyani yuboraman.", createdAt: daysAgo(1) },
  ]);

  // -------------------- 17. NOTIFICATIONS --------------------
  await db.insert(schema.notifications).values([
    { userId: U["murodxojayev"], type: "task.assigned", title: "Yangi vazifa: Audit log moduli yakunlash", message: "Sizga 'Audit log moduli yakunlash' vazifasi yuklandi.", link: `/tasks/${T["t13"]}`, relatedEntityType: "task", relatedEntityId: T["t13"], isRead: false },
    { userId: U["murodxojayev"], type: "task.mention", title: "Sizni eslab o'tishdi", message: "Toshxo'jayev Hasan sizni eslab o'tdi.", link: `/tasks/${T["t13"]}`, isRead: false },
    { userId: U["mirzaliyev"], type: "task.mention", title: "Sizni eslab o'tishdi", message: "Bobomurodov Shavkat sizni eslab o'tdi.", link: `/tasks/${T["t3"]}`, isRead: true, readAt: daysAgo(5) },
    { userId: U["bobomurodov"], type: "deliverable.submitted", title: "Yangi material yuklandi: Yo'lbars berar dars", message: "Lola Animation animatsiya preview-sini yukladi.", link: `/projects/${projYolbars[0].id}`, isRead: false },
    { userId: U["ahmedov"], type: "task.status_changed", title: "Vazifa holati o'zgardi", message: "'Audit log moduli' vazifasi davom etmoqda.", link: `/tasks/${T["t13"]}`, isRead: false },
    { userId: U["toshxojayev"], type: "deliverable.submitted", title: "Chempion: tahrir talab qilindi", message: "Stsenariy tahrirlanishi kerak.", link: `/projects/${projChempion[0].id}`, isRead: false },
    { userId: U["kamilova"], type: "leave.requested", title: "Yangi ta'til so'rovi", message: "Jumayev Umarjon ta'til so'radi.", link: "/leaves", isRead: false },
    { userId: U["kamilova"], type: "leave.requested", title: "Yangi ta'til so'rovi", message: "Mingboyev Sanjarbek ta'til so'radi.", link: "/leaves", isRead: false },
    { userId: U["serobov"], type: "task.deadline_24h", title: "24 soat ichida muddat: Reklama bannerini yangilash", link: `/tasks`, isRead: false },
    { userId: U["murodxojayev"], type: "leave.approved", title: "Ta'til ma'qullandi", message: "Sizning ta'til so'rovingiz tasdiqlandi.", link: "/leaves", isRead: true, readAt: daysAgo(2) },
  ]);

  // -------------------- 18. ACTIVITY LOG HIGHLIGHTS --------------------
  await db.insert(schema.activityLog).values([
    { userId: U["ahmedov"], action: "company.contractor_approved", entityType: "external_company", entityId: lola[0].id, newValue: { name: "Lola Animation" }, ipAddress: "10.0.0.1", userAgent: "Mozilla/5.0", createdAt: daysAgo(120) },
    { userId: U["toshxojayev"], action: "company.contractor_approved", entityType: "external_company", entityId: bolalar[0].id, newValue: { name: "Bolalar Production" }, ipAddress: "10.0.0.1", userAgent: "Mozilla/5.0", createdAt: daysAgo(95) },
    { userId: U["bobomurodov"], action: "project.completed", entityType: "project", entityId: projSehrlandiya[0].id, newValue: { score: 5 }, ipAddress: "10.0.0.2", userAgent: "Mozilla/5.0", createdAt: daysAgo(10) },
    { userId: U["kamilova"], action: "employee.invited", entityType: "user", newValue: { email: "ilhamov.mahmudjon@bkrm.uz" }, ipAddress: "10.0.0.3", userAgent: "Mozilla/5.0", createdAt: daysAgo(150) },
  ]);

  console.log("Seed complete.");
  console.log("---");
  console.log("Direktor:    ahmedov.jahongir@bkrm.uz");
  console.log("O'rinbosar:  toshxojayev.hasan@bkrm.uz");
  console.log("HR:          kamilova.nargiza@bkrm.uz");
  console.log("Koordinator: ismatullayev.baxodir@bkrm.uz");
  console.log("Dev/author:  murodxojayev.baxtiyorxoja@bkrm.uz");
  console.log("Contractor:  rahimjonov.azimjon@lolaanimation.uz");
  console.log("Password for all: Password123!");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
