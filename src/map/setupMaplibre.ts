import { setWorkerUrl } from "maplibre-gl";

/**
 * MapLibre 6 resolves its worker next to import.meta.url. Vite's optimizer
 * rewrites that to `.vite/deps/maplibre-gl-worker.mjs` (404). The preview
 * proxy also drops `?worker_file&type=module`. Serve the official worker +
 * shared chunk as same-origin static files instead.
 */
if (typeof window !== "undefined") {
  setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.href).href);
}
