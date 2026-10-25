/** Share links require an explicitly configured public HTTPS origin. */
export function getPublicSiteUrl(raw: string | undefined): URL | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw.trim());
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !hostname.includes(".") || hostname.endsWith(".localhost") ||
      /\.(?:local|internal|test|example)$/.test(hostname) ||
      /^(?:example\.(?:com|org|net)|(?:\d{1,3}\.){3}\d{1,3})$/.test(hostname)) return undefined;
    return new URL(url.origin);
  } catch {
    return undefined;
  }
}
