import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { A11yProvider } from "@/lib/a11y";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-source-serif",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">
        <A11yProvider>
          {children}
          <ServiceWorkerRegister />
        </A11yProvider>
      </body>
    </html>
  );
}
