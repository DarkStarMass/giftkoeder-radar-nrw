# Giftköder-Radar NRW

Local-First PWA für Giftköder-Meldungen in Nordrhein-Westfalen.
Kein Login, keine Cookies, keine Tracker. Die Wahrheit lebt im Browser
(PGLite + IndexedDB) — mit optionalem Edge-Sync zwischen Geräten.

Caya und Shadow. Vision: Rick. Architektur: Vega. Build: Grok.

**GitHub:** [DarkStarMass/giftkoeder-radar-nrw](https://github.com/DarkStarMass/giftkoeder-radar-nrw)

## Was die App tut

- Karte NRW (basemap.de Web-Raster / BKG, OSM als Fallback)
- Fundstelle antippen oder **Fund melden**
- Rote Marker, Vorlesen der Warnung
- Lokale Datenbank im Browser, offline nutzbar
- Edge-Sync `POST /api/sync` — teilt nur `id, lat, lng, status, created_at`
  (Spitzname und PLZ bleiben lokal)

## Start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

Node 22+. Kein Konto. Keine Analytics.

## Stack

TanStack Start · React 19 · MapLibre GL · react-map-gl · PGLite · Tailwind v4

## Lizenz

MIT — nimm es, fork es, gib es weiter. Hunde sollen laufen dürfen, ohne Giftköder.

---

# Giftköder-Radar NRW (English)

A local-first PWA for reporting poisoned baits in North Rhine-Westphalia.
No login, no cookies, no trackers. Reports live in the browser (PGLite + IndexedDB),
with an optional unowned edge sync for sharing coordinates between users.

MIT licensed. Built with React, TanStack Start, MapLibre, and PGLite.
