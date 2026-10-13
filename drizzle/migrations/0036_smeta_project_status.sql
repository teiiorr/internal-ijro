-- Smeta komissiyasi loyihalari: komissiya qarori holati.
-- jarayonda (standart) | xulosa_berildi | qaytarildi.
-- Faqat YANGI ustun — mavjud ustunlarga tegilmaydi (additive, takroriy ishga tushirish xavfsiz).
-- Kod bu migratsiyasiz ham ishlaydi: holatni oʻqishda 'jarayonda' standart qiymat qaytariladi,
-- yozish esa 42703 (undefined_column) uchun himoyalangan.
ALTER TABLE "smeta_commission_projects" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'jarayonda';
