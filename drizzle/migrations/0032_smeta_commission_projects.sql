-- Smeta komissiyasiga oʻtgan loyihalar: komissiya koʻrib chiqayotgan loyihalar roʻyxati
-- (Smeta komissiyasi sahifasida "Majlis qoʻshish" oʻrniga).
-- Faqat YANGI jadval — mavjud jadvallarga tegmaydi (additive, takroriy ishga tushirish xavfsiz).
CREATE TABLE IF NOT EXISTS "smeta_commission_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(300) NOT NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "smeta_commission_projects_created_idx" ON "smeta_commission_projects" ("created_at");
