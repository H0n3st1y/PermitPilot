import { describe, expect, it } from "vitest";
import { getPublicSiteUrl } from "./siteMetadata";

// which origins are safe to use in share links
describe("public share URL configuration", () => {
  // missing, http, local, placeholder, and credentialed origins are dropped
  it("omits missing, insecure, local, placeholder and credential-bearing origins", () => {
    // each of these should be rejected
    for (const raw of [undefined, "", "not a URL", "http://permitpilot.com", "https://localhost", "https://app.localhost", "https://127.0.0.1", "https://192.168.1.4", "https://[::1]", "https://example.com", "https://app.test", "https://user:secret@permitpilot.com", "https://permitpilot.com:3000"]) {
      expect(getPublicSiteUrl(raw)).toBeUndefined();
    }
  });

  // a good https origin is kept, without the path or query
  it("uses the configured HTTPS origin without leaking paths or queries into asset links", () => {
    const origin = getPublicSiteUrl(" https://app.permitpilot.com/preview?token=private#section ");
    expect(origin?.href).toBe("https://app.permitpilot.com/");
    expect(new URL("/brand/social-card.png", origin).href).toBe("https://app.permitpilot.com/brand/social-card.png");
  });
});
