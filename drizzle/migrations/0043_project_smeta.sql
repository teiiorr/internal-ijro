-- 0043: loyiha smetasi — har bir loyiha bo'yicha batafsil reja/fakt harajat moddalari.
-- Faqat YANGI jadval (additive) — mavjud jadvallarga tegmaydi, takroriy ishga tushirish xavfsiz.
-- Pul ustunlari `stage_payments` uslubida: decimal(15,2) + currency.
--
-- Qo'lda qo'llanadi (psql), drizzle journaliga qo'shilmaydi — journal 0024'da
-- muzlab qolgan (keyingi migratsiyalar shu konvensiya bo'yicha qo'lda bajariladi).

CREATE TABLE IF NOT EXISTS "project_smeta_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "category" varchar(120) NOT NULL,
  "description" text,
  "planned_amount" decimal(15, 2) DEFAULT '0' NOT NULL,
  "actual_amount" decimal(15, 2),
  "currency" varchar(10) DEFAULT 'UZS' NOT NULL,
  "order_index" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_smeta_items_project_idx" ON "project_smeta_items" ("project_id");
