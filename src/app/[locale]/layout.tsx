import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { Montserrat, Onest, Instrument_Serif, JetBrains_Mono } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-latin",
  display: "swap",
});

const onest = Onest({
  subsets: ["latin", "cyrillic", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cyrillic",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${montserrat.variable} ${onest.variable} ${instrumentSerif.variable} ${jbMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider initial="system">
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { fontFamily: "var(--font-sans)", borderRadius: "12px" },
            }}
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
