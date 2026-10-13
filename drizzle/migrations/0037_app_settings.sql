-- Tizim sozlamalari (kalit-qiymat). Hozircha faqat "maintenance_mode" ("on" | "off").
-- Texnik rejim tumblerini (Egasi paneli) saqlaydi. Additive, idempotent — qayta ishga tushirish xavfsiz.
-- Kod bu migratsiyasiz ham ishlaydi: jadval boʻlmasa, texnik rejim "off" deb oʻqiladi.
CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" varchar(64) PRIMARY KEY,
  "value" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
