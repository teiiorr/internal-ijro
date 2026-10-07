-- Yangi loyiha turi: "Qisqa metrajli film" — "Toʻliq metrajli badiiy film"dan keyin turadi.
-- Bosqichlari toʻliq metrajli film bilan bir xil (tmpl_film6, 6 davr):
--   1. Adabiy ssenariy yozish davri
--   2. Rejissyorlik ssenariysini yozish va qisman tayyorgarlik davri
--   3. Toʻliq tayyorgarlik davri
--   4. Tasvirga olish davri
--   5. Postprodakshn davri
--   6. Topshirish davri
-- Faqat maʼlumot qoʻshadi; takroriy ishga tushirish xavfsiz (tur bor boʻlsa hech narsa qilmaydi).
DO $$
DECLARE tmpl uuid; pos int;
BEGIN
  IF EXISTS (SELECT 1 FROM project_types WHERE code = 'short_film') THEN
    RAISE NOTICE 'short_film allaqachon mavjud';
    RETURN;
  END IF;
  SELECT id INTO tmpl FROM stage_templates WHERE code = 'tmpl_film6';
  IF tmpl IS NULL THEN RAISE EXCEPTION 'tmpl_film6 shabloni topilmadi'; END IF;
  SELECT order_index + 1 INTO pos FROM project_types WHERE code = 'feature_film';
  pos := coalesce(pos, 1);
  UPDATE project_types SET order_index = order_index + 1 WHERE order_index >= pos;
  INSERT INTO project_types (code, name_uz_latn, name_uz_cyrl, name_ru, stage_template_id, order_index, is_active)
  VALUES ('short_film', 'Qisqa metrajli film', 'Қисқа метражли фильм', 'Короткометражный фильм', tmpl, pos, true);
  RAISE NOTICE 'OK: Qisqa metrajli film qoshildi (tartib %)', pos;
END $$;
