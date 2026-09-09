import type { LocalDb } from "./initLocalDB";
import { isInsideNrw } from "@/map/nrw";

export interface EdgeDelta {
  id: string;
  lat: number;
  lng: number;
  status: string;
  timestamp: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDelta(report: EdgeDelta): boolean {
  if (!UUID_RE.test(report.id)) return false;
  if (!Number.isFinite(report.lat) || !Number.isFinite(report.lng)) return false;
  if (!isInsideNrw(report.lat, report.lng)) return false;
  if (!Number.isFinite(report.timestamp) || report.timestamp <= 0) return false;
  if (typeof report.status !== "string" || report.status.length > 20) return false;
  return true;
}

async function readLocalDeltas(db: LocalDb): Promise<EdgeDelta[]> {
  const result = await db.query<{
    id: string;
    lat: number;
    lng: number;
    status: string;
    timestamp: number | string;
  }>(
    `SELECT id::text AS id, lat, lng, status,
            floor(extract(epoch from created_at))::int AS timestamp
     FROM reports
     WHERE created_at >= NOW() - INTERVAL '24 hours'
       AND coalesce(nickname, '') <> 'Beispiel'`,
  );
  return result.rows
    .map((row) => ({
      id: String(row.id),
      lat: Number(row.lat),
      lng: Number(row.lng),
      status: String(row.status),
      timestamp: Number(row.timestamp),
    }))
    .filter(isValidDelta);
}

async function mergeRemote(db: LocalDb, reports: EdgeDelta[]): Promise<void> {
  for (const report of reports) {
    if (!isValidDelta(report)) continue;
    const created = new Date(report.timestamp * 1000).toISOString();
    await db.query(
      `INSERT INTO reports (id, lat, lng, status, created_at)
       VALUES ($1::uuid, $2, $3, $4, $5::timestamp)
       ON CONFLICT (id) DO NOTHING`,
      [report.id, report.lat, report.lng, report.status, created],
    );
  }
}

export const syncWithEdge = async (db: LocalDb): Promise<EdgeDelta[]> => {
  try {
    const localReports = await readLocalDeltas(db);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localReports }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error("Sync API offline");
    const serverData = (await response.json()) as unknown;
    if (!Array.isArray(serverData)) throw new Error("Sync payload invalid");
    const deltas = serverData.filter(
      (item): item is EdgeDelta =>
        !!item &&
        typeof item === "object" &&
        isValidDelta({
          id: String((item as EdgeDelta).id),
          lat: Number((item as EdgeDelta).lat),
          lng: Number((item as EdgeDelta).lng),
          status: String((item as EdgeDelta).status ?? "unbestätigt"),
          timestamp: Number((item as EdgeDelta).timestamp),
        }),
    );
    await mergeRemote(db, deltas);
    console.debug("[syncWithEdge] ok", deltas.length);
    return deltas;
  } catch (error) {
    console.warn("Edge-Sync fehlgeschlagen - App läuft lokal weiter:", error);
    return [];
  }
};
