import type { Metadata, Viewport } from "next";
import { A11yProvider } from "@/lib/a11y";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getPublicSiteUrl } from "@/lib/siteMetadata";
import "./globals.css";

// tab title and the short blurb search results can show
const title = "PermitPilot — A clearer path to your next project";
const description = "Turn a project idea into a clear permit roadmap. Organize documents, understand estimated fees, and track your next step in one place. Demonstration planning guidance.";
// full image url only works if we know the public site
const siteUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
const socialImage = siteUrl ? new URL("/brand/social-card.png", siteUrl).href : undefined;

// icons, social cards, and the install manifest
export const metadata: Metadata = {
  title,
  description,
  // skip the base url when the site address is not set
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  openGraph: {
    type: "website",
    siteName: "PermitPilot",
    title,
    description,
    // big preview image only when we have a public url for it
    ...(socialImage ? { images: [{ url: socialImage, width: 1200, height: 630, alt: "PermitPilot — Your project. A clearer path forward." }] } : {}),
  },
  twitter: {
    // large card when the image exists, otherwise a plain summary
    card: socialImage ? "summary_large_image" : "summary",
    title,
    description,
    // same image on the twitter card, or a plain summary without it
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

// navy browser chrome and a width that fits the phone
export const viewport: Viewport = {
  themeColor: "#153a56",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// every page sits inside the language provider and the service worker
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
