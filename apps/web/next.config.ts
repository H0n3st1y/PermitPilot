import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    // stop next from treating the parent folder as the app
    root: path.join(__dirname),
  },
  async headers() {
    let cloudConnections = "";
    try {
      const cloudUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "");
      if (cloudUrl.protocol === "https:" || (process.env.NODE_ENV !== "production" && cloudUrl.protocol === "http:")) {
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
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
              "worker-src 'self' blob:",
              `connect-src 'self'${cloudConnections}${process.env.NODE_ENV === "production" ? "" : " http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*"}`,
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
