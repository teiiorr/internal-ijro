// Egasining "maxfiy rejimi": sahifadagi pul summalarini yashiradi (ekran namoyişi uçun).
// Funksiya özini özi taʼminlaydi (importsiz, taşqi özgaruvçilarsiz): u server tomonida
// toString() orqali inline <script> ga aylanadi va sahifa çizilişidan OLDIN işga tuşadi,
// şu bois summa bir lahzaga ham körinmaydi. Mijoz komponenti uni yana çaqirişi mumkin
// (bir marta örnatiladi).
//
// Qanday yashiradi: element butunlay summadan iborat bölsa ("120 000 000 UZS") unga
// data-ijro-money qöyiladi va CSS uni xiralaştiradi; summa uzun matn içida bölsa, faqat
// summaning özi CSS Highlight API bilan bekitiladi (DOM özgarmaydi, React buzilmaydi).

export type MoneyPrivacyApi = { set: (on: boolean) => void; isOn: () => boolean };

export function installMoneyPrivacy(win: Window & { __ijroMoneyPrivacy?: MoneyPrivacyApi }): MoneyPrivacyApi {
  if (win.__ijroMoneyPrivacy) return win.__ijroMoneyPrivacy;
  const doc = win.document;
  const root = doc.documentElement;
  const KEY = "ijro-privacy";
  const ATTR = "data-ijro-money";
  const CUR = "(?:UZS|USD|EUR|RUB|so[ʻ'‘’`]?m|сўм|сум|руб\\.?|\\$|€|₽)";
  const NUM = "[-−+]?\\d{1,3}(?:[\\s   .,']\\d{3})*(?:[.,]\\d+)?";
  const MONEY_SRC = "(?:" + NUM + "\\s*" + CUR + "(?![A-Za-zЀ-ӿ])|(?<![A-Za-zЀ-ӿ])" + CUR + "\\s*" + NUM + "|\\d{1,3}(?:[\\s   ]\\d{3}){2,}(?:[.,]\\d+)?)";
  const MONEY = new RegExp(MONEY_SRC, "gi");
  const MONEY_ONE = new RegExp(MONEY_SRC, "i");
  const PURE_NUMBER = /^[\s   ]*[-−+]?\d[\d\s   .,']*[\s   ]*$/;
  const HAS_CUR = new RegExp(CUR + "(?![A-Za-zЀ-ӿ])", "i");
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT|OPTION|TITLE|CODE|PRE)$/;
  const hl: { set?: (n: string, h: unknown) => void; delete?: (n: string) => void } | undefined =
    (win as unknown as { CSS?: { highlights?: { set: (n: string, h: unknown) => void; delete: (n: string) => void } } }).CSS?.highlights;
  const HighlightCtor = (win as unknown as { Highlight?: new () => { add: (r: Range) => void; delete: (r: Range) => void; clear: () => void } }).Highlight;
  const highlight = hl && HighlightCtor ? new HighlightCtor() : null;
  const ranges = new Map<Text, Range[]>();
  let on = false;
  let observer: MutationObserver | null = null;

  const onlyMoney = (text: string) => {
    const t = text.replace(MONEY, "").replace(/[\s   :=~≈()\-−+%.,/|]+/g, "");
    return t.length === 0 && MONEY_ONE.test(text);
  };

  function clearNode(node: Text) {
    const old = ranges.get(node);
    if (old && highlight) old.forEach((r) => highlight.delete(r));
    ranges.delete(node);
  }

  function scanText(node: Text) {
    clearNode(node);
    const text = node.data;
    // Raqamsiz matn summa bölolmaydi (valyuta sözi alohida bölsa, raqamli qöşni tekşiradi).
    if (!/\d/.test(text)) return;
    const parent = node.parentElement;
    if (!parent || SKIP.test(parent.tagName) || parent.closest("[contenteditable=true],[data-privacy-skip]")) return;
    const whole = parent.childElementCount <= 8 ? (parent.textContent || "").trim() : text.trim();
    // 1) Element butunlay summa: "120 000 000 UZS" (bitta yoki bir neça matn bölagida).
    if (whole && whole.length <= 48 && onlyMoney(whole)) {
      parent.setAttribute(ATTR, "");
      return;
    }
    // 2) Faqat raqam, valyuta esa qöşni elementda: "<b>120 000</b> <i>UZS</i>".
    if (PURE_NUMBER.test(text) && /\d{3}/.test(text)) {
      let a: Element | null = parent.parentElement;
      for (let k = 0; a && k < 2; k++, a = a.parentElement) {
        const at = (a.textContent || "").trim();
        if (at.length <= 48 && HAS_CUR.test(at) && onlyMoney(at)) {
          parent.setAttribute(ATTR, "");
          return;
        }
      }
    }
    if (parent.hasAttribute(ATTR) && !onlyMoney(whole)) parent.removeAttribute(ATTR);
    // 3) Uzun matn içidagi summa: faqat uning özi yashiriladi.
    if (!highlight) {
      if (MONEY_ONE.test(text)) parent.setAttribute(ATTR, "");
      return;
    }
    const found: Range[] = [];
    MONEY.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MONEY.exec(text))) {
      const r = doc.createRange();
      r.setStart(node, m.index);
      r.setEnd(node, m.index + m[0].length);
      highlight.add(r);
      found.push(r);
    }
    if (found.length) ranges.set(node, found);
  }

  function scanTree(n: Node) {
    if (n.nodeType === 3) {
      scanText(n as Text);
      return;
    }
    if (n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11) return;
    const walker = doc.createTreeWalker(n, 4);
    let t = walker.nextNode();
    while (t) {
      scanText(t as Text);
      t = walker.nextNode();
    }
  }

  function start() {
    if (observer) return;
    if (highlight && hl?.set) hl.set("ijro-money", highlight);
    if (doc.body) scanTree(doc.body);
    observer = new MutationObserver((list) => {
      for (const rec of list) {
        if (rec.type === "characterData") {
          scanText(rec.target as Text);
          continue;
        }
        rec.removedNodes.forEach((n) => {
          if (n.nodeType === 3) clearNode(n as Text);
          else if (n.nodeType === 1) {
            const w = doc.createTreeWalker(n, 4);
            for (let t = w.nextNode(); t; t = w.nextNode()) clearNode(t as Text);
          }
        });
        rec.addedNodes.forEach((n) => scanTree(n));
      }
    });
    // Body hali yöq bölsa (skript <head>/body boşida) butun hujjatni kuzatamiz: parser qöşgan
    // har bir tugun çizilişdan oldin tekşiriladi.
    observer.observe(doc, { childList: true, subtree: true, characterData: true });
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    if (hl?.delete) hl.delete("ijro-money");
    highlight?.clear();
    ranges.clear();
    doc.querySelectorAll("[" + ATTR + "]").forEach((el) => el.removeAttribute(ATTR));
  }

  function set(next: boolean) {
    on = next;
    try {
      if (next) win.localStorage.setItem(KEY, "1");
      else win.localStorage.removeItem(KEY);
    } catch {
      /* localStorage yöq */
    }
    if (next) {
      root.setAttribute("data-privacy", "on");
      start();
    } else {
      root.removeAttribute("data-privacy");
      stop();
    }
  }

  const api: MoneyPrivacyApi = { set, isOn: () => on };
  win.__ijroMoneyPrivacy = api;
  let saved = false;
  try {
    saved = win.localStorage.getItem(KEY) === "1";
  } catch {
    saved = false;
  }
  if (saved) set(true);
  return api;
}
