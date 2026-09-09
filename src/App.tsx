// App.tsx - Architecture Bootstrap by Vega & Rick
// Target Model: Grok Synthesis

import { useEffect, useRef, useState } from "react";
import "@/map/setupMaplibre";
import { worker } from "@electric-sql/pglite/worker";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import { initLocalDB, insertReport, loadReports, type LocalDb } from "@/db/initLocalDB";
import { syncWithEdge } from "@/db/syncWithEdge";
import type { ReportRow } from "@/db/types";
import { narrateWarning } from "@/a11y/tts";
import { WarningMarker } from "@/map/WarningMarker";
import { RasterFallbackMap } from "@/map/RasterFallbackMap";
import { MapGuard } from "@/map/MapGuard";
import {
  BASEMAP_DE_RASTER_STYLE,
  BASEMAP_DE_STYLE,
  RASTER_FALLBACK_STYLE,
  type MapStyleValue,
} from "@/map/basemap";
import { NRW_CENTER, NRW_MAX_BOUNDS, haversineMeters } from "@/map/nrw";
import { ReportSheet, type DraftCoord } from "@/report/ReportSheet";
import { registerTileCacheWorker } from "@/pwa/register-sw";

// Sperrregel: worker-Import bleibt stehen, auch ungenutzt im Bootstrap.
void worker;

function resizeMap(map: MapRef | null) {
  if (!map) return;
  const native = typeof map.getMap === "function" ? map.getMap() : map;
  native.resize();
}

function canUseWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function App() {
  const [db, setDb] = useState<LocalDb | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<DraftCoord>(null);
  const [locating, setLocating] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [mapStyle, setMapStyle] = useState<MapStyleValue>(BASEMAP_DE_STYLE);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [webgl] = useState(() => canUseWebGL());
  const mapRef = useRef<MapRef | null>(null);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const fallbackStep = useRef(0);
  const userPos = useRef<DraftCoord>(null);

  const useRaster = !webgl || mapFailed || !mapReady;

  useEffect(() => {
    initLocalDB()
      .then(async (instance) => {
        setDb(instance);
        setReports(await loadReports(instance));
      })
      .catch((err: unknown) => {
        setDbError(err instanceof Error ? err.message : "PGLite startete nicht.");
      });
  }, []);

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    const tick = async () => {
      await syncWithEdge(db);
      if (cancelled) return;
      setReports(await loadReports(db));
    };
    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [db]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const box = mapBoxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      resizeMap(mapRef.current);
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (mapReady) {
      registerTileCacheWorker();
      return;
    }
    const timer = window.setTimeout(() => {
      setMapFailed(true);
      registerTileCacheWorker();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [mapReady]);

  function handleMarker(report: ReportRow) {
    const here = userPos.current;
    const meters = here
      ? Math.max(1, Math.round(haversineMeters(here.lat, here.lng, report.lat, report.lng)))
      : 50;
    narrateWarning(meters);
  }

  function handleMapClick(event: { lngLat: { lat: number; lng: number } }) {
    const next = { lat: event.lngLat.lat, lng: event.lngLat.lng };
    setDraft(next);
    if (!sheetOpen) setSheetOpen(true);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        userPos.current = next;
        setDraft(next);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }

  async function submitReport(input: { nickname: string; plz: string }) {
    if (!db || !draft) throw new Error("Datenbank oder Position fehlt.");
    const row = await insertReport(db, { ...input, lat: draft.lat, lng: draft.lng });
    setReports((prev) => [row, ...prev]);
    setSheetOpen(false);
    setDraft(null);
    void syncWithEdge(db).then(async () => {
      setReports(await loadReports(db));
    });
  }

  return (
    <div className="app-shell bg-paper font-sans text-ink">
      {/* Caya & Shadow Header Banner */}
      <header className="relative h-48 w-full shrink-0 overflow-hidden bg-moss">
        <img
          src="/1310.jpg"
          alt="Caya und Shadow"
          className="h-full w-full object-cover object-[center_72%] opacity-90"
        />
        <div className="absolute bottom-4 left-4 rounded bg-ink/80 px-4 py-2">
          <h1 className="text-xl font-bold text-title">Giftköder-Radar NRW</h1>
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-earth/30 px-4 py-2 text-sm">
        <p className="min-w-0 truncate">
          {db ? (
            <span>
              {reports.length} {reports.length === 1 ? "Meldung" : "Meldungen"} lokal
              {!online ? " · offline" : ""}
            </span>
          ) : dbError ? (
            <span>Datenbank: {dbError}</span>
          ) : (
            <span>Lokale Datenbank startet…</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="flex h-16 min-w-16 shrink-0 items-center justify-center rounded-md px-3 font-medium text-moss hover:bg-moss/10 touch-manipulation"
        >
          Hinweis
        </button>
      </div>

      <main className="map-stage">
        {useRaster ? (
          <RasterFallbackMap
            reports={reports}
            draft={draft}
            onMapClick={(coord) => handleMapClick({ lngLat: coord })}
            onMarker={handleMarker}
          />
        ) : null}

        {webgl ? (
          <MapGuard onFail={() => setMapFailed(true)}>
            <div
              ref={mapBoxRef}
              className="map-stage-inner"
              style={{
                opacity: mapReady && !mapFailed ? 1 : 0,
                pointerEvents: mapReady && !mapFailed ? "auto" : "none",
              }}
            >
              <Map
                ref={mapRef}
                initialViewState={{
                  longitude: NRW_CENTER.longitude,
                  latitude: NRW_CENTER.latitude,
                  zoom: NRW_CENTER.zoom,
                }}
                mapStyle={mapStyle}
                style={{ width: "100%", height: "100%" }}
                maxBounds={NRW_MAX_BOUNDS}
                attributionControl={{ compact: true }}
                dragRotate={false}
                pitchWithRotate={false}
                canvasContextAttributes={{
                  preserveDrawingBuffer: true,
                  powerPreference: "low-power",
                  failIfMajorPerformanceCaveat: false,
                }}
                onLoad={() => {
                  setMapReady(true);
                  setMapFailed(false);
                  resizeMap(mapRef.current);
                  requestAnimationFrame(() => resizeMap(mapRef.current));
                }}
                onClick={handleMapClick}
                onError={() => {
                  if (fallbackStep.current === 0) {
                    fallbackStep.current = 1;
                    setMapStyle(BASEMAP_DE_RASTER_STYLE);
                  } else if (fallbackStep.current === 1) {
                    fallbackStep.current = 2;
                    setMapStyle(RASTER_FALLBACK_STYLE);
                  } else {
                    setMapFailed(true);
                  }
                }}
              >
                <NavigationControl position="top-left" showCompass={false} />
                {draft ? (
                  <Marker longitude={draft.lng} latitude={draft.lat} anchor="center">
                    <span
                      className="block h-4 w-4 rounded-full border-2 border-paper bg-moss shadow"
                      aria-hidden="true"
                    />
                  </Marker>
                ) : null}
                {reports.map((report) => (
                  <WarningMarker key={report.id} report={report} onSelect={handleMarker} />
                ))}
              </Map>
            </div>
          </MapGuard>
        ) : null}

        <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-paper/90 px-3 py-2 text-sm font-medium text-ink shadow-sm">
          Karte antippen setzt die Fundstelle
        </p>
      </main>

      {/* Floating Action Button */}
      {!sheetOpen && !infoOpen ? (
        <button
          className="fixed z-50 flex h-20 w-20 items-center justify-center rounded-full border-4 border-paper bg-threat text-sm font-bold text-paper shadow-lg touch-manipulation"
          style={{
            bottom: "max(2rem, env(safe-area-inset-bottom))",
            right: "max(2rem, env(safe-area-inset-right))",
          }}
          onClick={() => setSheetOpen(true)}
        >
          Fund
          <br />
          melden
        </button>
      ) : null}

      <ReportSheet
        open={sheetOpen}
        coord={draft}
        locating={locating}
        onClose={() => setSheetOpen(false)}
        onRequestLocation={requestLocation}
        onSubmit={submitReport}
      />

      {infoOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="Hinweis schließen"
            onClick={() => setInfoOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            className="relative z-10 m-0 w-full max-w-lg rounded-t-xl bg-paper p-6 text-ink shadow-lg sm:mb-8 sm:rounded-xl"
          >
            <h2 id="info-title" className="text-xl font-semibold">
              Local-First, ohne Tracker
            </h2>
            <p className="mt-3 text-base leading-normal">
              Die Wahrheit lebt in diesem Browser (PGLite + IndexedDB). Kein Login,
              keine Cookies, keine Analytics, keine Google-SDKs. Rote Marker sind
              Warnungen — antippen liest sie vor.
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              Caya und Shadow. Vision: Rick. Architektur: Vega.
            </p>
            <button
              type="button"
              className="mt-5 flex min-h-16 w-full items-center justify-center rounded-md bg-moss text-base font-semibold text-paper touch-manipulation"
              onClick={() => setInfoOpen(false)}
            >
              Verstanden
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
