import { PGlite } from "@electric-sql/pglite";
import { PGliteWorker } from "@electric-sql/pglite/worker";
import type { ReportRow } from "./types";

export type LocalDb = PGlite | PGliteWorker;

const DB_PATH = "idb://giftkoeder-nrw-db";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * System Skill 02: WASM Database Initialization
 * SQL from Appendix B bootstrap — word-identical CREATE TABLE.
 * Extra columns via ALTER only (nickname, plz). No silent schema rewrite.
 * Worker uses the locked pglite/worker import so WASM stays off the UI thread.
 */
export const initLocalDB = async (): Promise<LocalDb> => {
  const db = await openPglite();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      status VARCHAR(20) DEFAULT 'unbestätigt',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.exec(`
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS nickname VARCHAR(40);
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS plz VARCHAR(5);
  `);
  await seedExamplesIfEmpty(db);
  return db;
};

async function openPglite(): Promise<LocalDb> {
  if (typeof Worker !== "undefined") {
    try {
      const bg = new Worker(new URL("./pglite.worker.ts", import.meta.url), {
        type: "module",
      });
      const db = new PGliteWorker(bg, { id: "giftkoeder-nrw-db" });
      await withTimeout(db.waitReady, 20000, "PGLite worker timeout");
      return db;
    } catch (err) {
      console.debug("[initLocalDB] worker open failed", err);
    }
  }
  const db = await withTimeout(PGlite.create(DB_PATH), 8000, "PGLite IndexedDB Timeout");
  await db.waitReady;
  return db;
}

const EXAMPLES: Array<Pick<ReportRow, "lat" | "lng" | "nickname" | "plz">> = [
  { lat: 50.9234, lng: 6.8741, nickname: "Beispiel", plz: "50933" },
  { lat: 51.2277, lng: 6.7735, nickname: "Beispiel", plz: "40479" },
  { lat: 51.5136, lng: 7.4653, nickname: "Beispiel", plz: "44137" },
];

async function seedExamplesIfEmpty(db: LocalDb) {
  const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM reports");
  if ((count.rows[0]?.n ?? 0) > 0) return;
  for (const row of EXAMPLES) {
    await db.query(
      `INSERT INTO reports (lat, lng, status, nickname, plz)
       VALUES ($1, $2, 'unbestätigt', $3, $4)`,
      [row.lat, row.lng, row.nickname, row.plz],
    );
  }
}

export async function loadReports(db: LocalDb): Promise<ReportRow[]> {
  const result = await db.query<ReportRow>(
    `SELECT id::text AS id, lat, lng, status, created_at::text AS created_at, nickname, plz
     FROM reports
     ORDER BY created_at DESC`,
  );
  return result.rows;
}

export async function insertReport(
  db: LocalDb,
  input: { lat: number; lng: number; nickname: string; plz: string },
): Promise<ReportRow> {
  const result = await db.query<ReportRow>(
    `INSERT INTO reports (lat, lng, status, nickname, plz)
     VALUES ($1, $2, 'unbestätigt', $3, $4)
     RETURNING id::text AS id, lat, lng, status, created_at::text AS created_at, nickname, plz`,
    [input.lat, input.lng, input.nickname, input.plz],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Insert returned no row");
  return row;
}
