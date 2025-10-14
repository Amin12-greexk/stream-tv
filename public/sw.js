const MEDIA_CACHE = "media-v1";
const JSON_CACHE = "json-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Cache media aggressively
  if (url.pathname.startsWith("/api/stream/")) {
    e.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetchP = fetch(e.request).then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        });
        return cached || fetchP;
      })
    );
    return;
  }

  // SWR for playlist JSON
  if (url.pathname.startsWith("/api/player/playlist")) {
    e.respondWith(
      caches.open(JSON_CACHE).then(async (cache) => {
        const fetchP = fetch(e.request).then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(async () => {
          const cached = await cache.match(e.request);
          if (cached) return cached;
          throw new Error("offline and no cache");
        });
        return fetchP;
      })
    );
    return;
  }
});
