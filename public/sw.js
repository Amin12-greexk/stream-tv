// public/sw.js
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Don't cache video streams, always network
  if (url.pathname.startsWith("/api/stream/")) {
    e.respondWith(fetch(e.request)); // no cache
    return;
  }

  // keep your JSON SWR if you like
  if (url.pathname.startsWith("/api/player/playlist")) {
    e.respondWith(
      caches.open("json-v1").then(async (cache) => {
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
