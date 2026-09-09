// @ts-nocheck
/* Cache-first only for actual tiles. Style JSON stays network-first. */
const CACHE = "giftkoeder-tiles-v3";
const TILE_HOSTS = [
  "sgx.geodatenzentrum.de",
  "basemap.de",
  "tiles.openfreemap.org",
  "www.wms.nrw.de",
  "www.wmts.nrw.de",
  "tile.openstreetmap.org",
  "a.tile.openstreetmap.org",
  "b.tile.openstreetmap.org",
];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const match = TILE_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith("." + host),
  );
  if (!match) return;
  if (/\.json(\?|$)/i.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (hit) return hit;
    throw err;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}
