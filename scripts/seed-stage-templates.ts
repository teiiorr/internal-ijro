import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, gte } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

/**
 * Seeds the 9 project types and their 7 shared stage templates.
 *
 * Idempotent — safe to run repeatedly on a populated database (unlike
 * scripts/seed.ts, which aborts when users exist). Everything is keyed by a
 * stable `code`, so re-running upserts names/order without creating duplicates
 * and never touches users/projects. Types 1&2 share `tmpl_film6`; types 4&5
 * share `tmpl_anim4`.
 *
 *   pnpm db:seed:templates
 */

type Item = { uz: string; cy: string; ru: string; days?: number };
type Template = { code: string; nameUzLatn: string; items: Item[] };
type TypeDef = { code: string; uz: string; cy: string; ru: string; template: string };

const TEMPLATES: Template[] = [
  {
    code: "tmpl_film6",
    nameUzLatn: "To'liq metrajli film / serial (6 bosqich)",
    items: [
      { uz: "Adabiy ssenariy yozish davri", cy: "Адабий сценарий ёзиш даври", ru: "Период написания литературного сценария" },
      { uz: "Rejissyorlik ssenariysini yozish va qisman tayyorgarlik davri", cy: "Режиссёрлик сценарийсини ёзиш ва қисман тайёргарлик даври", ru: "Период написания режиссёрского сценария и частичной подготовки" },
      { uz: "To'liq tayyorgarlik davri", cy: "Тўлиқ тайёргарлик даври", ru: "Период полной подготовки" },
      { uz: "Tasvirga olish davri", cy: "Тасвирга олиш даври", ru: "Период съёмок" },
      { uz: "Postprodakshn davri", cy: "Постпродакшн даври", ru: "Период постпродакшна" },
      { uz: "Topshirish davri", cy: "Топшириш даври", ru: "Период сдачи" },
    ],
  },
  {
    code: "tmpl_comedy5",
    nameUzLatn: "Hajviy kinojurnal (5 bosqich)",
    items: [
      { uz: "Adabiy ssenariy yozish", cy: "Адабий сценарий ёзиш", ru: "Написание литературного сценария" },
      { uz: "To'liq tayyorgarlik", cy: "Тўлиқ тайёргарлик", ru: "Полная подготовка" },
      { uz: "Tasvirga olish", cy: "Тасвирга олиш", ru: "Съёмки" },
      { uz: "Postprodakshn", cy: "Постпродакшн", ru: "Постпродакшн" },
      { uz: "Topshirish", cy: "Топшириш", ru: "Сдача" },
    ],
  },
  {
    code: "tmpl_anim4",
    nameUzLatn: "Multserial / anime (4 bosqich)",
    items: [
      { uz: "Ssenariy yozish va 3D modellashtirish", cy: "Сценарий ёзиш ва 3D моделлаштириш", ru: "Написание сценария и 3D-моделирование" },
      { uz: "Ishlab chiqarish", cy: "Ишлаб чиқариш", ru: "Производство" },
      { uz: "Postprodakshn", cy: "Постпродакшн", ru: "Постпродакшн" },
      { uz: "Topshirish", cy: "Топшириш", ru: "Сдача" },
    ],
  },
  {
    code: "tmpl_tvshow4",
    nameUzLatn: "Teledastur / realiti-shou (4 bosqich)",
    items: [
      { uz: "Konsepsiyani yozish va tayyorgarlik", cy: "Концепцияни ёзиш ва тайёргарлик", ru: "Написание концепции и подготовка" },
      { uz: "Tasvirga olish", cy: "Тасвирга олиш", ru: "Съёмки" },
      { uz: "Postprodakshn", cy: "Постпродакшн", ru: "Постпродакшн" },
      { uz: "Topshirish", cy: "Топшириш", ru: "Сдача" },
    ],
  },
  {
    code: "tmpl_game4",
    nameUzLatn: "Raqamli o'yin / platforma (4 bosqich)",
    items: [
      { uz: "Konsepsiyani yozish", cy: "Концепцияни ёзиш", ru: "Написание концепции" },
      { uz: "Konsept-art qismini tayyorlash", cy: "Концепт-арт қисмини тайёрлаш", ru: "Подготовка концепт-арта" },
      { uz: "Ishlab chiqarish", cy: "Ишлаб чиқариш", ru: "Производство" },
      { uz: "Topshirish", cy: "Топшириш", ru: "Сдача" },
    ],
  },
  {
    code: "tmpl_book3",
    nameUzLatn: "Kitob (3 bosqich)",
    items: [
      { uz: "Manbalarni o'rganish va/yoki matnni yozish", cy: "Манбаларни ўрганиш ва/ёки матнни ёзиш", ru: "Изучение источников и/или написание текста" },
      { uz: "Dizayn va sahifalash", cy: "Дизайн ва саҳифалаш", ru: "Дизайн и вёрстка" },
      { uz: "Nashrga tayyorlash va chop etish", cy: "Нашрга тайёрлаш ва чоп этиш", ru: "Подготовка к печати и издание" },
    ],
  },
  {
    code: "tmpl_dub1",
    nameUzLatn: "Dublyaj (1 bosqich)",
    items: [
      { uz: "Ishlab chiqarish", cy: "Ишлаб чиқариш", ru: "Производство" },
    ],
  },
  {
    code: "tmpl_theatre4",
    nameUzLatn: "Spektakl (1 bosqich)",
    items: [
      { uz: "Pyesa yozish va sahnalashtirish", cy: "Пьеса ёзиш ва саҳналаштириш", ru: "Написание пьесы и постановка" },
    ],
  },
  {
    code: "tmpl_exclusive3",
    nameUzLatn: "Eksklyuziv loyiha (1 bosqich)",
    items: [
      { uz: "Ishlab chiqarish", cy: "Ишлаб чиқариш", ru: "Производство" },
    ],
  },
];

const TYPES: TypeDef[] = [
  { code: "feature_film", uz: "To'liq metrajli badiiy film", cy: "Тўлиқ метражли бадиий фильм", ru: "Полнометражный художественный фильм", template: "tmpl_film6" },
  { code: "serial", uz: "Seriallar", cy: "Сериаллар", ru: "Сериалы", template: "tmpl_film6" },
  { code: "comedy_journal", uz: "Hajviy kinojurnallar", cy: "Ҳажвий киножурналлар", ru: "Сатирические киножурналы", template: "tmpl_comedy5" },
  { code: "multserial", uz: "Multseriallar", cy: "Мультсериаллар", ru: "Мультсериалы", template: "tmpl_anim4" },
  { code: "anime_film", uz: "To'liq metrajli anime va animatsion filmlar", cy: "Тўлиқ метражли аниме ва анимацион фильмлар", ru: "Полнометражные аниме и анимационные фильмы", template: "tmpl_anim4" },
  { code: "tv_show", uz: "Teledasturlar va realiti-shoular", cy: "Теледастурлар ва реалити-шоулар", ru: "Телепрограммы и реалити-шоу", template: "tmpl_tvshow4" },
  { code: "digital_game", uz: "Raqamli o'yinlar va platformalar", cy: "Рақамли ўйинлар ва платформалар", ru: "Цифровые игры и платформы", template: "tmpl_game4" },
  { code: "book", uz: "Kitoblar", cy: "Китоблар", ru: "Книги", template: "tmpl_book3" },
  { code: "dubbing", uz: "Dublyaj qilinayotgan loyihalar", cy: "Дубляж қилинаётган лойиҳалар", ru: "Проекты дубляжа", template: "tmpl_dub1" },
  { code: "theatre_play", uz: "Spektakllar", cy: "Спектакллар", ru: "Спектакли", template: "tmpl_theatre4" },
  { code: "exclusive_project", uz: "Eksklyuziv loyihalar", cy: "Эксклюзив лойиҳалар", ru: "Эксклюзивные проекты", template: "tmpl_exclusive3" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema });

  const templateIdByCode = new Map<string, string>();

  for (const tmpl of TEMPLATES) {
    // Upsert the template by its stable code.
    await db
      .insert(schema.stageTemplates)
      .values({ code: tmpl.code, nameUzLatn: tmpl.nameUzLatn })
      .onConflictDoUpdate({ target: schema.stageTemplates.code, set: { nameUzLatn: tmpl.nameUzLatn } });
    const [{ id: templateId }] = await db
      .select({ id: schema.stageTemplates.id })
      .from(schema.stageTemplates)
      .where(eq(schema.stageTemplates.code, tmpl.code))
      .limit(1);
    templateIdByCode.set(tmpl.code, templateId);

    // Upsert each item by (templateId, orderIndex) — stable positions keep their id.
    for (let i = 0; i < tmpl.items.length; i++) {
      const it = tmpl.items[i];
      await db
        .insert(schema.stageTemplateItems)
        .values({
          templateId,
          orderIndex: i,
          nameUzLatn: it.uz,
          nameUzCyrl: it.cy,
          nameRu: it.ru,
          defaultDurationDays: it.days ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.stageTemplateItems.templateId, schema.stageTemplateItems.orderIndex],
          set: { nameUzLatn: it.uz, nameUzCyrl: it.cy, nameRu: it.ru, defaultDurationDays: it.days ?? null },
        });
    }
    // Prune any items left over from a previously longer template definition.
    await db
      .delete(schema.stageTemplateItems)
      .where(
        and(
          eq(schema.stageTemplateItems.templateId, templateId),
          gte(schema.stageTemplateItems.orderIndex, tmpl.items.length)
        )
      );
  }

  for (let i = 0; i < TYPES.length; i++) {
    const t = TYPES[i];
    const stageTemplateId = templateIdByCode.get(t.template);
    if (!stageTemplateId) throw new Error(`missing template ${t.template} for type ${t.code}`);
    await db
      .insert(schema.projectTypes)
      .values({
        code: t.code,
        nameUzLatn: t.uz,
        nameUzCyrl: t.cy,
        nameRu: t.ru,
        stageTemplateId,
        orderIndex: i,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.projectTypes.code,
        set: { nameUzLatn: t.uz, nameUzCyrl: t.cy, nameRu: t.ru, stageTemplateId, orderIndex: i, isActive: true },
      });
  }

  console.log(`Seeded ${TEMPLATES.length} templates and ${TYPES.length} project types.`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
