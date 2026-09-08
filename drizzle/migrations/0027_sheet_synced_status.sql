-- Google Sheets sinxroni oxirgi marta yozgan qiymatni saqlaydi. Sinxron faqat
-- varaqdagi matn shu ustundan farq qilganda (ya'ni varaqda o'zgarganda) yozadi,
-- shu tariqa ilovada qo'lda kiritilgan yangi izohni eskirgan varaq ustiga yozib
-- o'chirmaydi. Nullable + additive — mavjud ma'lumotga ta'sir qilmaydi.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sheet_synced_status" text;
