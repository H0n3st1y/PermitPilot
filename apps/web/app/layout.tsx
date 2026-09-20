import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Noto_Sans_Arabic, Noto_Sans_Bengali, Noto_Sans_Devanagari, Noto_Sans_SC, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { A11yProvider } from "@/lib/a11y";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n/localeCookie";
import { isLocale, localeDir } from "@/lib/i18n/types";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

const notoSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-sc",
  display: "swap",
});

const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "700"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-noto-arabic",
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "700"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PermitPilot: permit roadmaps you can check",
  description: "Permits, documents, fees, timelines, and inspection prep for residents and small businesses, from deterministic rules with checkable sources.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#173b57",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = parseLocale(raw);
  return (
    <html lang={locale} dir={localeDir(locale)} className={`${sans.variable} ${serif.variable} ${notoSc.variable} ${notoDeva.variable} ${notoArabic.variable} ${notoBengali.variable}`}>
      <body className="font-sans antialiased">
        <A11yProvider initialLocale={locale} localeCookieSet={isLocale(raw)}>
          {children}
          <ServiceWorkerRegister />
        </A11yProvider>
      </body>
    </html>
  );
}
