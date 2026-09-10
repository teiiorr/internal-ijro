-- Yashirin xodim bayrog'i: DB'da mavjud va tizimga kira oladi, lekin frontend
-- ro'yxatlari/tanlovlari/panellarida ko'rsatilmaydi (HR reyestri, mas'ul/kurator
-- tanlovi, @eslatma, boshqaruv paneli reytinglari — hammasi `hidden = false` bilan filtrlanadi).
-- Additive + default false — mavjud foydalanuvchilarga ta'sir qilmaydi.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;
