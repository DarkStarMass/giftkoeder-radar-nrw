export function registerTileCacheWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;
  navigator.serviceWorker.register("/sw-tile-cache.js").catch((err) => {
    console.debug("[sw] tile-cache register skipped", err);
  });
}
