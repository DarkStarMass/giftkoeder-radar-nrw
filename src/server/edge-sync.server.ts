import { getSql } from "@/lib/db";
import { isInsideNrw } from "@/map/nrw";
import type { EdgeDelta } from "@/db/syncWithEdge";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUS = new Set([
  "unbestätigt",
  "bestätigt",
  "abgelaufen",
  "pending",
  "confirmed",
  "expired",
]);

const MAX_INCOMING = 100;
const MAX_STORE = 2000;

function normalizeStatus(raw: string): string {
  if (ALLOWED_STATUS.has(raw)) return raw;
  return "unbestätigt";
}

export function parseDelta(raw: unknown): EdgeDelta | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? "");
  if (!UUID_RE.test(id)) return null;
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!isInsideNrw(lat, lng)) return null;
  const status = normalizeStatus(String(r.status ?? "unbestätigt"));
  let timestamp = Number(r.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    if (typeof r.created_at === "string") {
      const ms = Date.parse(r.created_at);
      if (!Number.isNaN(ms)) timestamp = Math.floor(ms / 1000);
    }
  }
  const now = Date.now() / 1000;
  if (!Number.isFinite(timestamp) || timestamp <= 0) timestamp = Math.floor(now);
  if (timestamp > now + 3600 || timestamp < now - 86400 * 30) {
    timestamp = Math.floor(now);
  }
  return { id, lat, lng, status, timestamp };
}

export async function mergeAndList(incoming: unknown[]): Promise<EdgeDelta[]> {
  const sql = await getSql();
  const batch = incoming.slice(0, MAX_INCOMING).map(parseDelta).filter((d): d is EdgeDelta => d !== null);

  for (const report of batch) {
    const created = new Date(report.timestamp * 1000).toISOString();
    await sql.query(
      `insert into edge_reports (id, lat, lng, status, created_at)
       values ($1, $2, $3, $4, $5::timestamptz)
       on conflict (id) do nothing`,
      [report.id, report.lat, report.lng, report.status, created],
    );
  }

  const rows = await sql.query<{
    id: string;
    lat: number;
    lng: number;
    status: string;
    created_at: string | Date;
  }>(
    `select id, lat, lng, status, created_at
     from edge_reports
     order by created_at desc
     limit ${MAX_STORE}`,
  );

  return rows.map((row) => {
    const ms =
      row.created_at instanceof Date
        ? row.created_at.getTime()
        : Date.parse(String(row.created_at));
    return {
      id: String(row.id),
      lat: Number(row.lat),
      lng: Number(row.lng),
      status: String(row.status),
      timestamp: Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000),
    };
  });
}
