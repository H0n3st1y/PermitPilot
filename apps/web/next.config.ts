import path from "path";
import type { NextConfig } from "next";

// Next build output and the headers sent on every response
const nextConfig: NextConfig = {
  // Ship a self-contained server bundle
  output: "standalone",
  // Leave the Next.js powered-by header off
  poweredByHeader: false,
  turbopack: {
    // stop next from treating the parent folder as the app
    root: path.join(__dirname),
  },
  // Security headers on every route
  async headers() {
    // Extra connect-src hosts when Supabase is configured
    let cloudConnections = "";
    try {
      const cloudUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "");
      // https anytime, and http only while developing
      if (cloudUrl.protocol === "https:" || (process.env.NODE_ENV !== "production" && cloudUrl.protocol === "http:")) {
        // The site origin and its websocket version, for realtime
        cloudConnections = ` ${cloudUrl.origin} ${cloudUrl.origin.replace(/^http/, "ws")}`;
      }
    } catch { /* An unconfigured sample does not need external connections. */ }
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS only on the production build
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              // unsafe-eval is added while developing
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
              "worker-src 'self' blob:",
              // Supabase when it is set, plus localhost while developing
              `connect-src 'self'${cloudConnections}${process.env.NODE_ENV === "production" ? "" : " http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*"}`,
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
