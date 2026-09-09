import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportRow } from "@/db/types";
import { NRW_BBOX, NRW_CENTER } from "./nrw";
import { ThreatPin } from "./ThreatPin";
import { basemapDeWmsTileUrl, osmTileUrl } from "./basemap";
import type { DraftCoord } from "@/report/ReportSheet";

const TILE = 256;
const MIN_Z = 6;
const MAX_Z = 14;

type Props = {
  reports: ReportRow[];
  draft: DraftCoord;
  onMapClick: (coord: { lat: number; lng: number }) => void;
  onMarker: (report: ReportRow) => void;
};

type View = { lng: number; lat: number; zoom: number };

function lngLatToWorld(lng: number, lat: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sin = Math.min(0.9999, Math.max(-0.9999, Math.sin((lat * Math.PI) / 180)));
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldToLngLat(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lng, lat };
}

function clampView(view: View): View {
  const zoom = Math.min(MAX_Z, Math.max(MIN_Z, view.zoom));
  const lng = Math.min(NRW_BBOX.east + 0.4, Math.max(NRW_BBOX.west - 0.4, view.lng));
  const lat = Math.min(NRW_BBOX.north + 0.3, Math.max(NRW_BBOX.south - 0.3, view.lat));
  return { lng, lat, zoom };
}

function RasterTile({
  src,
  fallback,
  left,
  top,
}: {
  src: string;
  fallback: string;
  left: number;
  top: number;
}) {
  const [url, setUrl] = useState(src);
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className="raster-tile"
      style={{ transform: `translate(${left}px, ${top}px)` }}
      onError={() => {
        if (url !== fallback) setUrl(fallback);
      }}
    />
  );
}

export function RasterFallbackMap({ reports, draft, onMapClick, onMarker }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    view: View;
    moved: boolean;
  } | null>(null);
  const [view, setView] = useState<View>({
    lng: NRW_CENTER.longitude,
    lat: NRW_CENTER.latitude,
    zoom: NRW_CENTER.zoom,
  });
  const [size, setSize] = useState({ w: 390, h: 480 });

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const apply = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 8 && rect.height > 8) {
        setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const tiles = useMemo(() => {
    const z = Math.round(view.zoom);
    const center = lngLatToWorld(view.lng, view.lat, z);
    const originX = center.x - size.w / 2;
    const originY = center.y - size.h / 2;
    const x0 = Math.floor(originX / TILE) - 1;
    const y0 = Math.floor(originY / TILE) - 1;
    const x1 = Math.ceil((originX + size.w) / TILE) + 1;
    const y1 = Math.ceil((originY + size.h) / TILE) + 1;
    const list: Array<{
      key: string;
      left: number;
      top: number;
      src: string;
      fallback: string;
    }> = [];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const src = basemapDeWmsTileUrl(z, x, y);
        const fallback = osmTileUrl(z, x, y);
        if (!src || !fallback) continue;
        list.push({
          key: `${z}/${x}/${y}`,
          left: x * TILE - originX,
          top: y * TILE - originY,
          src,
          fallback,
        });
      }
    }
    return { list, z, originX, originY };
  }, [view, size]);

  function clientToLngLat(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return null;
    const rect = box.getBoundingClientRect();
    const z = Math.round(view.zoom);
    const center = lngLatToWorld(view.lng, view.lat, z);
    const worldX = center.x - rect.width / 2 + (clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (clientY - rect.top);
    return worldToLngLat(worldX, worldY, z);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      view,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (Math.hypot(dx, dy) > 8) state.moved = true;
    if (!state.moved) return;
    const z = Math.round(state.view.zoom);
    const origin = lngLatToWorld(state.view.lng, state.view.lat, z);
    const next = worldToLngLat(origin.x - dx, origin.y - dy, z);
    setView(clampView({ lng: next.lng, lat: next.lat, zoom: state.view.zoom }));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (state.moved) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const coord = clientToLngLat(event.clientX, event.clientY);
    if (coord) onMapClick({ lat: coord.lat, lng: coord.lng });
  }

  function zoomBy(delta: number) {
    setView((prev) => clampView({ ...prev, zoom: prev.zoom + delta }));
  }

  return (
    <div
      ref={boxRef}
      className="raster-map"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      role="application"
      aria-label="Karte Nordrhein-Westfalen"
    >
      {tiles.list.map((tile) => (
        <RasterTile
          key={tile.key}
          src={tile.src}
          fallback={tile.fallback}
          left={tile.left}
          top={tile.top}
        />
      ))}

      {reports.map((report) => {
        const pos = lngLatToWorld(report.lng, report.lat, tiles.z);
        const left = pos.x - tiles.originX;
        const top = pos.y - tiles.originY;
        return (
          <div
            key={report.id}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left, top }}
          >
            <ThreatPin
              label={`Warnung ${report.status}, antippen zum Vorlesen`}
              onSelect={() => onMarker(report)}
            />
          </div>
        );
      })}

      {draft ? (
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: lngLatToWorld(draft.lng, draft.lat, tiles.z).x - tiles.originX,
            top: lngLatToWorld(draft.lng, draft.lat, tiles.z).y - tiles.originY,
          }}
        >
          <span
            className="block h-4 w-4 rounded-full border-2 border-paper bg-moss shadow"
            aria-hidden="true"
          />
        </div>
      ) : null}

      <div className="absolute left-3 top-3 z-30 flex flex-col gap-2">
        <button
          type="button"
          className="flex h-16 w-16 items-center justify-center rounded-md bg-paper text-2xl font-bold text-ink shadow touch-manipulation"
          onClick={() => zoomBy(1)}
          aria-label="Hineinzoomen"
        >
          +
        </button>
        <button
          type="button"
          className="flex h-16 w-16 items-center justify-center rounded-md bg-paper text-2xl font-bold text-ink shadow touch-manipulation"
          onClick={() => zoomBy(-1)}
          aria-label="Herauszoomen"
        >
          −
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-1 right-1 z-20 rounded bg-paper/90 px-2 py-1 text-[10px] text-ink-soft">
        © GeoBasis-DE / BKG · basemap.de
      </p>
    </div>
  );
}
