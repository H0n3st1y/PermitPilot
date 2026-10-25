// Only public install assets are cached. Project pages, auth, API responses,
// document contents and Next.js navigation payloads always use the network.
const CACHE = "permitpilot-public-v4";
const OFFLINE = "/offline.html";
const PUBLIC_ASSETS = [OFFLINE, "/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_ASSETS)));
});

// Activate a waiting update only after a user has saved work and requested it.
self.addEventListener("message", (event) => {
  if (event.data?.type === "PERMITPILOT_ACTIVATE_UPDATE") event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("permitpilot-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      return (await caches.match(OFFLINE)) || new Response("You are offline. Reconnect and reload this page.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }));
    return;
  }

  if (PUBLIC_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
