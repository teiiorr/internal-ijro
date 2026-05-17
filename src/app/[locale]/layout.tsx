import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { Manrope, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin", "cyrillic", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
    <html lang={locale} className={`${manrope.variable} ${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider initial="system">
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { fontFamily: "var(--font-sans)", borderRadius: "12px" },
              className: "shadow-lifted",
            }}
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
