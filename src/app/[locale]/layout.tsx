import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { Montserrat, JetBrains_Mono, Cinzel_Decorative } from "next/font/google";

const montserrat = Montserrat({
  // weight 300 (font-light) is unused in the app; cyrillic-ext is required for
  // Uzbek Cyrillic (қ ғ ҳ …), so those subsets stay.
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

// Cinzel Decorative — engraved Roman caps that evoke the Godfather title card;
// used only for the owner's honorific. Latin-only (the honorific is Latin).
const cinzel = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-godfather",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

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
      className={`${montserrat.variable} ${jbMono.variable} ${cinzel.variable}`}
      suppressHydrationWarning
    >
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
