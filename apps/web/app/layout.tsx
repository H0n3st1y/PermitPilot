import type { Metadata, Viewport } from "next";
import { A11yProvider } from "@/lib/a11y";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getPublicSiteUrl } from "@/lib/siteMetadata";
import "./globals.css";

const title = "PermitPilot — A clearer path to your next project";
const description = "Turn a project idea into a clear permit roadmap. Organize documents, understand estimated fees, and track your next step in one place. Demonstration planning guidance.";
const siteUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
const socialImage = siteUrl ? new URL("/brand/social-card.png", siteUrl).href : undefined;

export const metadata: Metadata = {
  title,
  description,
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  openGraph: {
    type: "website",
    siteName: "PermitPilot",
    title,
    description,
    ...(socialImage ? { images: [{ url: socialImage, width: 1200, height: 630, alt: "PermitPilot — Your project. A clearer path forward." }] } : {}),
  },
  twitter: {
    card: socialImage ? "summary_large_image" : "summary",
    title,
    description,
    ...(socialImage ? { images: [{ url: socialImage, alt: "PermitPilot — Your project. A clearer path forward." }] } : {}),
  },
  manifest: "/manifest.webmanifest",
  applicationName: "PermitPilot",
  appleWebApp: { capable: true, title: "PermitPilot", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#153a56",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <A11yProvider>
          {children}
          <ServiceWorkerRegister />
        </A11yProvider>
      </body>
    </html>
  );
}
