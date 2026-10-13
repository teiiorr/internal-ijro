-- Bir loyiha ↔ bir neça studiya (many-to-many), additive va eskisiga toʻliq mos.
-- projects.external_company_id TEGILMAYDI — u "asosiy" studiya sifatida qoladi
-- (portal/auth/chat oqimlari oʻsha ustunga tayanadi). Faqat yangi jadval + indekslar;
-- backfill mavjud yagona bogʻlanishni koʻp-studiyali jadvalga koʻchiradi.
-- Takroriy ishga tushirish xavfsiz (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- Qoʻlda qoʻllanadi (psql), xuddi 0025..0033 kabi; drizzle journaliga qoʻshilmaydi.

CREATE TABLE IF NOT EXISTS "project_studios" (
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "external_companies"("id") ON DELETE CASCADE,
  "order_index" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "project_studios_pk" PRIMARY KEY ("project_id", "company_id")
);

CREATE INDEX IF NOT EXISTS "project_studios_project_idx" ON "project_studios" ("project_id");
CREATE INDEX IF NOT EXISTS "project_studios_company_idx" ON "project_studios" ("company_id");

-- Mavjud yagona studiyalarni koʻchiramiz (asosiy studiya tartib indeksi 0).
INSERT INTO "project_studios" ("project_id", "company_id", "order_index")
SELECT "id", "external_company_id", 0 FROM "projects" WHERE "external_company_id" IS NOT NULL
ON CONFLICT DO NOTHING;
