// only accept a real public https site, nothing local or half-configured
export function getPublicSiteUrl(raw: string | undefined): URL | undefined {
  // blank input means we have no public url
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw.trim());
    const hostname = url.hostname.toLowerCase();
    // drop insecure, local, placeholder, or credentialed urls
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !hostname.includes(".") || hostname.endsWith(".localhost") ||
      /\.(?:local|internal|test|example)$/.test(hostname) ||
      /^(?:example\.(?:com|org|net)|(?:\d{1,3}\.){3}\d{1,3})$/.test(hostname)) return undefined;
    // keep just the origin so paths and queries don't leak into links
    return new URL(url.origin);
  } catch {
    // a string that isn't a url
    return undefined;
  }
}
