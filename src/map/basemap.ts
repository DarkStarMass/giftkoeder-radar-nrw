import type { StyleSpecification } from "maplibre-gl";

/**
 * Bootstrap mapStyle was the placeholder
 *   "https://basemap.de/mvt/style.json"
 * Official BKG Farbe style (no API key) used in its place.
 */

export const BASEMAP_DE_STYLE =
  "https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json";

export const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** BKG WMS — STYLES= is required (empty default). {bbox-epsg-3857} is MapLibre. */
export const BASEMAP_DE_WMS_TEMPLATE =
  "https://sgx.geodatenzentrum.de/wms_basemapde?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=false&LAYERS=de_basemapde_web_raster_farbe&STYLES=&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}";

export const OSM_TILE_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const EARTH_3857 = 20037508.342789244;

export function basemapDeWmsTileUrl(z: number, x: number, y: number): string | null {
  const max = 2 ** z;
  const wrapX = ((x % max) + max) % max;
  if (y < 0 || y >= max) return null;
  const size = (EARTH_3857 * 2) / max;
  const minX = wrapX * size - EARTH_3857;
  const maxY = EARTH_3857 - y * size;
  const maxX = (wrapX + 1) * size - EARTH_3857;
  const minY = EARTH_3857 - (y + 1) * size;
  return BASEMAP_DE_WMS_TEMPLATE.replace("{bbox-epsg-3857}", `${minX},${minY},${maxX},${maxY}`);
}

export function osmTileUrl(z: number, x: number, y: number): string | null {
  const max = 2 ** z;
  const wrapX = ((x % max) + max) % max;
  if (y < 0 || y >= max) return null;
  return `https://tile.openstreetmap.org/${z}/${wrapX}/${y}.png`;
}

/** Official BKG Web-Raster (Farbe). Used when the vector style/worker fails. */
export const BASEMAP_DE_RASTER_STYLE: StyleSpecification = {
  version: 8,
  name: "basemap.de Web Raster",
  sources: {
    "basemap-de": {
      type: "raster",
      tiles: [BASEMAP_DE_WMS_TEMPLATE],
      tileSize: 256,
      attribution: "© GeoBasis-DE / BKG (basemap.de)",
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: "basemap-layer",
      type: "raster",
      source: "basemap-de",
    },
  ],
};

/** Last-resort OSM raster if BKG WMS is unreachable. */
export const RASTER_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  name: "OSM Raster Fallback",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        OSM_TILE_TEMPLATE,
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap-Mitwirkende",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export type MapStyleValue = string | StyleSpecification;

/**
 * NRW DOP WMS — Geobasis NRW. Endpoint noted, no fake tiles shipped.
 * Not wired as a live source until ToS is checked (Kapitel 7).
 */
export const NRW_DOP_WMS = "https://www.wms.nrw.de/geobasis/wms_nw_dop";
