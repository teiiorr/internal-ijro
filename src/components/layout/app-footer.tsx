/**
 * Mahsulot footeridagi mualliflik yozuvi. Dizayn tizimiga mos ravişda sodda va
 * közga taşlanmaydigan qilib saqlangan.
 */
export function AppFooter() {
  return (
    <footer className="mt-auto pt-8 pb-6 text-center text-xs text-[var(--subtle)]">
      Designed &amp; Developed by{" "}
      <a
        href="https://teiior.uz"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
      >
        teiior
      </a>
    </footer>
  );
}
