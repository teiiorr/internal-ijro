-- 0044: "Ichki hujjatlar" — bildirgilar va buyruqlar reyestri.
-- Faqat YANGI jadval (additive) — mavjud jadvallarga tegmaydi, takroriy ishga tushirish xavfsiz.
--
-- Qo'lda qo'llanadi (psql), drizzle journaliga qo'shilmaydi — journal 0024'da
-- muzlab qolgan (keyingi migratsiyalar shu konvensiya bo'yicha qo'lda bajariladi).

CREATE TABLE IF NOT EXISTS "internal_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" varchar(20) NOT NULL,
  "title" varchar(300) NOT NULL,
  "doc_number" varchar(60),
  "doc_date" date,
  "file_url" text NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_size" integer,
  "file_mime_type" varchar(120),
  "uploaded_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_documents_kind_chk') THEN
    ALTER TABLE "internal_documents"
      ADD CONSTRAINT "internal_documents_kind_chk" CHECK ("kind" in ('bildirgi','buyruq'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "internal_documents_kind_date_idx"
  ON "internal_documents" ("kind", "doc_date", "uploaded_at");
