-- Smeta komissiyasi loyihalari: son boʻyicha guruhlash + poster/maʼlumot.
-- Faqat YANGI ustunlar — mavjud ustunlarga tegilmaydi (additive, takroriy ishga tushirish xavfsiz).
-- Kod bu migratsiyasiz ham ishlaydi (yangi ustunlarni oʻqish/yozish 42703 uchun himoyalangan).
ALTER TABLE "smeta_commission_projects" ADD COLUMN IF NOT EXISTS "session_number" integer;
ALTER TABLE "smeta_commission_projects" ADD COLUMN IF NOT EXISTS "poster_url" text;
ALTER TABLE "smeta_commission_projects" ADD COLUMN IF NOT EXISTS "info" text;
CREATE INDEX IF NOT EXISTS "smeta_commission_projects_session_idx" ON "smeta_commission_projects" ("session_number");
