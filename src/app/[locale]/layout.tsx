import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

// Shriftlar: Manrope UZ (matn/UI) va Unbounded UZ (gold sarlavhalar) — oʻzbek harflari
// (ʻ ʼ Қ Ғ Ҳ) qoʻshilган patch-build'lar, self-hosted (src/styles/fonts.css, public/fonts).
// next/font/google olib tashlandi: endi CI build'i Google Fonts'ga bogʻliq emas.

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      data-locale={locale}
      suppressHydrationWarning
    >
      <head>
        {/* Mavzuni birinchi bo'yoqdan oldin qo'yamiz — miltillash bo'lmaydi (A3).
            `.dark` (eski uslublar) va `data-theme` (BIIB tokenlari) birga o'rnatiladi. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('theme');var t=(s==='light'||s==='dark')?s:(s==='system'?null:s);if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}})();",
          }}
        />
      </head>
      <body>
        <ThemeProvider initial="system">
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: "var(--font-sans)",
                borderRadius: "18px",
                backdropFilter: "blur(24px) saturate(180%)",
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.6)",
              },
            }}
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
