-- Joriy holat (current_status) updater — generated from the Google Sheet.
-- Matches projects by normalized name (letters+digits only) containing the
-- Cyrillic title OR its Latin transliteration. REVIEW the dry-run first.

-- normalize helper (letters+digits, lowercase)
-- 1) DRY RUN — see which DB project each sheet title matches:
--    (run this SELECT block alone first)
-- SELECT 'Orzu-havas qurbonlari' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%орзуҳавасқурбонлари%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%orzuhavasqurbonlari%';
-- SELECT 'Dayi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%дайи%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%dayi%';
-- SELECT 'Qitmir' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%қитмир%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%qitmir%';
-- SELECT 'Husayn' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%ҳусайн%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%husayn%';
-- SELECT 'Sirli kod' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сирликод%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sirlikod%';
-- SELECT 'Temurbek' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%темурбек%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%temurbek%';
-- SELECT 'Oldingdagi yo''l' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%олдингдагийўл%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%oldingdagiyol%';
-- SELECT 'Boburning bolaligi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бобурнингболалиги%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%boburningbolaligi%';
-- SELECT 'Bayroq ko''targan qiz' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%байроқкўтарганқиз%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bayroqkotarganqiz%';
-- SELECT 'Ikkichi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%иккичи%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ikkichi%';
-- SELECT 'Sersavol' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%серсавол%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sersavol%';
-- SELECT 'Chempion' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%чемпион%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%chempion%';
-- SELECT 'O''g''iloy' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%ўғилой%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ogiloy%';
-- SELECT 'Impuls' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%импульс%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%impuls%';
-- SELECT 'Farhod va Shirin' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%фарҳодваширин%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%farhodvashirin%';
-- SELECT 'Bi-bip' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бибип%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bibip%';
-- SELECT 'Shiroq va Oyqiz' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%широқваойқиз%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%shiroqvaoyqiz%';
-- SELECT 'Yo''l-bars berar dars' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%йўлбарсберардарс%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%yolbarsberardars%';
-- SELECT 'Tiprabek' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%типрабек%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%tiprabek%';
-- SELECT 'Alla' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%алла%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%alla%';
-- SELECT 'Burro' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бурро%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%burro%';
-- SELECT 'Sharaf kitobi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%шарафкитоби%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sharafkitobi%';
-- SELECT 'Madaniyat entsiklopediyasi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%маданиятэнциклопедияси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%madaniyatentsiklopediyasi%';
-- SELECT 'Pomidor Do''ppi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%помидордўппи%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%pomidordoppi%';
-- SELECT 'Sehrlandiya: qahramonlik missiyasi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрландияқаҳрамонликмиссияси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlandiyaqahramonlikmissiyasi%';
-- SELECT 'Boy ota' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бойота%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%boyota%';
-- SELECT 'Qirol Shokir' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%қиролшокир%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%qirolshokir%';
-- SELECT 'Sehrlandiya' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрландия%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlandiya%';
-- SELECT 'Zoocast' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%zoocast%';
-- SELECT 'Bolajon yulduzchasi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%болажонюлдузчаси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bolajonyulduzchasi%';
-- SELECT 'Jonim bolam' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%жонимболам%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%jonimbolam%';
-- SELECT 'Javohir izlovchilar' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%жавоҳиризловчилар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%javohirizlovchilar%';
-- SELECT 'Polapon: rostini ayt' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%полапонростиниайт%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%polaponrostiniayt%';
-- SELECT 'Bola podkast' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%болаподкаст%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bolapodkast%';
-- SELECT 'Alla ekspeditsiyasi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%аллаэкспедицияси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%allaekspeditsiyasi%';
-- SELECT 'Millat xazinasi' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%миллатхазинаси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%millatxazinasi%';
-- SELECT 'Sehrli xurjun' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрлихуржун%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlixurjun%';
-- SELECT 'Sehrli oltinqush' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрлиолтинқуш%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlioltinqush%';
-- SELECT 'Shum bola va kelajak shahri' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%шумболавакелажакшаҳри%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%shumbolavakelajakshahri%';
-- SELECT 'Ertak-romanlar' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%эртакроманлар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ertakromanlar%';
-- SELECT 'Masallar' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%масаллар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%masallar%';
-- SELECT 'Ertaklar' AS sheet, id, name FROM projects WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%эртаклар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ertaklar%';

BEGIN;

UPDATE projects SET current_status = $st$Сценарий янги концепция асосида муаллиф томонидан қайта ёзилиб, Марказга юборилган. Шу масала бўйича жавобни кутишмоқда. Экспертлар кенгашида кўрилиши керак (10.08)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%орзуҳавасқурбонлари%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%orzuhavasqurbonlari%';
UPDATE projects SET current_status = $st$Режиссёрлик сценарийси ёзилмоқда. Рассом ҳамда либослар бўйича рассом эскизлар чизишни бошлашган. Ижодий гуруҳ кастинг эълон қилиб, фото-видепроба ўтказишга тайёрланишмоқда. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%дайи%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%dayi%';
UPDATE projects SET current_status = $st$Cмета деярли тасдиқланди. Студия биттада 5 та қисм топширишни мўлжаллашмоқда. (03.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%қитмир%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%qitmir%';
UPDATE projects SET current_status = $st$Раскадровка жараёнлари ниҳоясига етди. Ролга танланган актёр болалар билан читка қилинмоқда. Шу билан бирга параллель тарзда декорациялар қурилмоқда. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%ҳусайн%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%husayn%';
UPDATE projects SET current_status = $st$Тўлиқ тайёргарлик даври давом этяпти. Режиссёр актёрлар билан читка қилмоқда. Ижодий гуруҳ ваниҳоят шакллантирилди. Ҳозир команда билан виртуал олам учун локациялар жойларга бориб кўриб келинмоқда. Рассом ва либослар бўйича рассом ўз линияси бўйича ишлашмоқда. (03.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сирликод%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sirlikod%';
UPDATE projects SET current_status = $st$Бундан ташқари ҳозир раскадровка жараёнлари кетмоқда. Ўзбекфильмдан хона олиниб, реквизитларнинг 80% саралаб олинди. Асосий қаҳрамонлар либоси учун материаллар олиб берилган. Ҳозирда тикиш жараёнлари ҳам давом этмоқда. 2-даражали рол ва оммавий саҳна актёрлари учун тайёр костюмлар сараланмоқда. Трюк саҳналаштирувчи томонидан актёр болаларнинг ота тез, қисқа юришлари, отни югуртириш, кураш усули, ерда ва отда югуриб камондан фойдаланиш машқлари ўргатилмоқда. Ҳозир Хўжаилғор қишлоғи декорацияси қурилиш жараёнида. 2 кундан сўнг фактура ишлари бошланади. ундан ташқари Мусобақа майдони қурилиши бошланади. кейин эса мўғул қароргоҳи қурилишига ўтилади. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%темурбек%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%temurbek%';
UPDATE projects SET current_status = $st$Ижодкорлар тўлиқ тайёргарлик босқичи бўйича иш олиб боришмоқда. Ролга танланган актёрлар билан читка+трюклар репетицияси кетмоқда. Ҳозир Ген.смета тайёрланмоқда. Тез орада тасвирга олиш ишларига тушилади. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%олдингдагийўл%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%oldingdagiyol%';
UPDATE projects SET current_status = $st$Лойиҳа кейинги босқичга ўтказилган. Ҳозир смета тайёрланмоқда. Тез орада Марказга топширилади. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бобурнингболалиги%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%boburningbolaligi%';
UPDATE projects SET current_status = $st$Тасвирга олиш жараёнлари давом этмоқда. Кеча,бугун - 2 кунлик смена қўйилган бўлиб, ижодий жамоа тоғли ҳудудда жойлашган дачада тасвирга олиш ишларини олиб боришмоқда. Кейинги тасвирга олиш ишлари 6-сентябрга мўлжалланган. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%байроқкўтарганқиз%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bayroqkotarganqiz%';
UPDATE projects SET current_status = $st$5.09 санасидан бошлаб 4 кун тасвирга олиш ишлари. 1-кун(4.09) Амир Темур ҳиёбони, 2-кун(5.09) 110-мактабда тасвирга олиш ишлари олиб борилади. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%иккичи%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ikkichi%';
UPDATE projects SET current_status = $st$Ижодий гуруҳ водийдан тасвирга олиш ишларини тугатиб қайтишди. Ҳозир Тошкентдаги тасвирга олиш ишлари қолди. 3 кунлик смена режалаштирилган бўлиб, ушбу сменалар ҳозирча умумий тасвирга олиш даврининг сўнги кунлари бўлиб турибди. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%серсавол%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sersavol%';
UPDATE projects SET current_status = $st$Фильм премьерасини ўтказиш бўйича ишланмоқда. Параллел равишда топшириш-қабул қилиш ишлари бўйича жараён бошланган. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%чемпион%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%chempion%';
UPDATE projects SET current_status = $st$Расмий равишда постпродакшн даврига ўтказилган бўлсада, монтаж жараёнида пайдо бўлаётган етишмаётган кадрлар зарурати туфайли қўшимча тасвирга олиш ишларини олиб боришмоқда.Параллел равишда монтаж ва овозлаштириш ишлари олиб борилмоқда. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%ўғилой%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ogiloy%';
UPDATE projects SET current_status = $st$Фильм ижодкорлари постпродакшн ишларини олиб боришяпти. Фильмнинг роботлар мусобақаси саҳналари учун анимациялар қилинмоқда (03.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%импульс%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%impuls%';
UPDATE projects SET current_status = $st$Сценарийнинг дастлабки драфти анча тайёр ҳолга келтирилган. Лойиҳа бўйича рассомлар гуруҳи эскиз чизиш жараёнида. 3D моделлаштириш бўйича жараён кетмоқда. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%фарҳодваширин%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%farhodvashirin%';
UPDATE projects SET current_status = $st$Анимацион фильм сценарийлари ёзилмоқда. Бошқа анимацион фильмларни такрорламаслиги учун янгича услуб ишлаб чиқишмоқчи. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бибип%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bibip%';
UPDATE projects SET current_status = $st$Ҳозирги вақтда тақдимотга тайёргарлик кўрилмоқда Унга бўлажак фильмнинг персонажлари, локациялар ва реквизитлар киритилади. Тақдимотни келаётган ҳафта топшириш режалаштирилган. Режиссёрлик сценарийси устида ишлар давом этмоқда. Тақдимот тасдиқлангандан сўнг, раскадровка ва сторйбоард, черновой озвучка ва анимация боскичига утилади. (03.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%широқваойқиз%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%shiroqvaoyqiz%';
UPDATE projects SET current_status = $st$- Сценарийнинг жами 20 қисми, раскадровка, лаёут ишлари тугаган.
- Бир вақтнинг ўзида 15 та қисм анимацияси устида иш жараёнлари кетмоқда. Ой охиригача қолган 5 та қисмнинг ҳам анимация жараёнлари бошланади.
- 20 қисмнинг барчаси қоралама овоз, қоралама мусиқа жараёнидан ўтган.
- 1-қисм тўлиқ FullНD рендер қисми тугатилган. 4К рендер жараёни бошланди.
- ЙПХ томонидан берилган фидбеклар асосида Йўлбарс кийимига ўзгартириш киритилиб, қайта рендер қилинди.
  (03.09.)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%йўлбарсберардарс%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%yolbarsberardars%';
UPDATE projects SET current_status = $st$Сценарийнинг 12 та қисми тайёр.
5 та қисмни анимацияси тайёр. Рендер ва сведения босқичи қолди. 6-қисмни анимация ишлари бошланди.
 Бир нечта сериянинг овозлаштириш ишлари параллель равишда олиб борилмоқда.(04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%типрабек%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%tiprabek%';
UPDATE projects SET current_status = $st$Платформа ишлаб чиқилган ва  контентлар жойлаштирилган. Платформани камчиликлар, ўзгартиришлари белгилаб берилган. Тв апп варианти тайёрланмоқда.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%алла%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%alla%';
UPDATE projects SET current_status = $st$Кейинги босқич бўйича ишлар кетмоқда$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бурро%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%burro%';
UPDATE projects SET current_status = $st$Ҳозирда китобнинг 3 та тилдаги синов-нашри тайёрланди. Ҳозир дарслик версияси ҳам тайёрланмоқда. (3.09)
Рассом тузатиш киритиши учун айтилган шахсларнинг суратлари ватман қоғозга чиқарилиб, Алишер Алиқуловга етказилган. Шу билан бирга дизайнер берилган фидбекларни тайёрлаб чиққан.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%шарафкитоби%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sharafkitobi%';
UPDATE projects SET current_status = $st$Типрабек персонажидан фойдаланиб янги дизайн тайёрланиб, Марказга топширишган. Бу бўйича муҳокама қилинган.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%маданиятэнциклопедияси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%madaniyatentsiklopediyasi%';
UPDATE projects SET current_status = $st$54,55,56 ва 57 қисмлар бўйича тайёрланшан ишлар:
Анимация ишлари тайёр. Ҳозир овозлаштириш жараёнлари кетмоқда. Лойиҳа бўйича тасдиқланган муддатларга мувофиқ олиб борилмоқда. (04.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%помидордўппи%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%pomidordoppi%';
UPDATE projects SET current_status = $st$Лойиҳа бўйича ҳозир тайёрланган графика бўйича сайқаллаш ишлари кетмоқда.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрландияқаҳрамонликмиссияси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlandiyaqahramonlikmissiyasi%';
UPDATE projects SET current_status = $st$Рақамли ўйин расмий жиҳатдан кейинги босқичга ўтиб, ишлаб давом этмоқда.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%бойота%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%boyota%';
UPDATE projects SET current_status = $st$Мультсериалнинг 200 та қисмини тўлиқ ўзбек тилига дубляж қилинган варианти топширилди. Ҳозир қолган 50 қисмлар бўйича дубляж кетмоқда ҳамда қолган 50 қисмлар свидение жараёниқда. (03.09)
300 та қисмининг сценарийси ўзбек тилига таржима қилиниб, Марказга тақдим этилди. Таҳлил бўлими томонидан барча сценарийлар қиёсий кўриб чиқилмоқда ва лойиҳа ижрочиларига етказиляпти.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%қиролшокир%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%qirolshokir%';
UPDATE projects SET current_status = $st$Лойиҳа тўлиқ якунланди. (10.08) Якунланиш бўйича барча ҳужжатлар расмийлаштирилган$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрландия%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlandiya%';
UPDATE projects SET current_status = $st$Студия вакиллари, Марказга лойиҳанинг 6 та қисмини просмотр қилишга олиб келишди ва 10-октябр куни лойиҳани тўлиқ якунлаб, нуқта қўйилишини билдиришди. (4.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%zoocast%';
UPDATE projects SET current_status = $st$Кўрсатувнинг 1-сони экспертлар кенгашида намойиш қилинди. Зарур ўзгартиришлар лойиҳа ижрочиларига  айтилди (3.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%болажонюлдузчаси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bolajonyulduzchasi%';
UPDATE projects SET current_status = $st$Лойиҳа реалити-шоу форматидан бир неча қисмли ҳужжатли фильм форматида тасвирга олинадиган бўлди. Ҳозир янги коцепсияни топширишлари керак$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%жонимболам%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%jonimbolam%';
UPDATE projects SET current_status = $st$Ижодий гуруҳ лойиҳани тасвирга олиш ишлари бошланмасидан олдин тайёрланган реклама роликлари, анонслар, логотиплар ва кўрсатув мадҳиясини Марказга олиб келиб, кўрсатишди. Зарур ўзгартиришлар лойиҳа ижрочиларига айтилди. (03.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%жавоҳиризловчилар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%javohirizlovchilar%';
UPDATE projects SET current_status = $st$Қурилган декорацияда кўрсатувнинг бир неча қисми тасвирга олинди$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%полапонростиниайт%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%polaponrostiniayt%';
UPDATE projects SET current_status = $st$Подкастнинг 4 та сони суратга олинган. Ҳозир сметаси тайёрланмоқда. (Лойиҳа тўхтатилган)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%болаподкаст%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%bolapodkast%';
UPDATE projects SET current_status = $st$Ҳозир экспедиция бошланди. Ҳозир жамоа Тошкент вилояти бўйлаб айланиб, параллел равишда ҳужжатли фильмни ҳам суратга олишмоқда$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%аллаэкспедицияси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%allaekspeditsiyasi%';
UPDATE projects SET current_status = $st$Смета тасдиқланди. Ҳозир шартнома имзоланиш ишлари кетмоқда. (03.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%миллатхазинаси%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%millatxazinasi%';
UPDATE projects SET current_status = $st$Спектакл устида ишлар бошланган. Ҳозирда қўғирчоқлар ясалмоқда. Декорация устида ишлар олиб борилмоқда (03.09)$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрлихуржун%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlixurjun%';
UPDATE projects SET current_status = $st$Лойиҳа сметасини ҳали топширмади.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%сеҳрлиолтинқуш%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%sehrlioltinqush%';
UPDATE projects SET current_status = $st$Спектакл устида ишлар бошланган.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%шумболавакелажакшаҳри%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%shumbolavakelajakshahri%';
UPDATE projects SET current_status = $st$Ёзиш жараёни давом этмоқда. Ҳар бир ижодкор билан алоқада бўлиб турилибди.$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%эртакроманлар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ertakromanlar%';
UPDATE projects SET current_status = $st$Муҳаррир матн устида ишламоқда$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%масаллар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%masallar%';
UPDATE projects SET current_status = $st$Муҳаррир матн устида ишламоқда$st$, updated_at = now()
  WHERE regexp_replace(lower(name),'[^0-9a-zа-яёўқғҳ]','','g') LIKE '%эртаклар%' OR regexp_replace(lower(name),'[^0-9a-z]','','g') LIKE '%ertaklar%';

-- Projects still without a status after the update (fill manually via the app):
-- SELECT id, name FROM projects WHERE current_status IS NULL OR current_status = '';

COMMIT;
