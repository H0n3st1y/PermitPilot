// Only public install assets are cached. Project pages, auth, API responses,
// document contents and Next.js navigation payloads always use the network.
// Cache name, so activate can drop older copies
const CACHE = "permitpilot-public-v4";
// Page we show when a navigation fails while offline
const OFFLINE = "/offline.html";
// The only URLs this worker is allowed to store
const PUBLIC_ASSETS = [OFFLINE, "/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/icons/apple-touch-icon.png"];

// On install, store those public files for later
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_ASSETS)));
});

// Activate a waiting update only after a user has saved work and requested it.
self.addEventListener("message", (event) => {
  // The page asked for the update, so stop waiting
  if (event.data?.type === "PERMITPILOT_ACTIVATE_UPDATE") event.waitUntil(self.skipWaiting());
});

// Drop old PermitPilot caches, then take control of open pages
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("permitpilot-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Same-origin reads only. Other requests go straight to the network.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Ignore writes and anything from another origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Page loads always try the network first
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      // If the network fails, use the cached offline page, or a short text fallback
      return (await caches.match(OFFLINE)) || new Response("You are offline. Reconnect and reload this page.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }));
    return;
  }

  // Known public files can come from the cache, then the network
  if (PUBLIC_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
