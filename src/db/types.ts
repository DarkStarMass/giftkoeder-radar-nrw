/**
 * Dual data contract — do not silently merge.
 *
 * Master-Prompt (EN): status enum pending | confirmed | expired, timestamp Unix epoch.
 * Bootstrap-SQL: status VARCHAR default 'unbestätigt', created_at TIMESTAMP.
 *
 * GrokBuild default until Rick decides: keep the bootstrap table, map in TS.
 */

export type BootstrapStatus = "unbestätigt" | "bestätigt" | "abgelaufen";

/** Prompt-side enum. Mapping to BootstrapStatus is open (Kapitel 4). */
export type PromptStatus = "pending" | "confirmed" | "expired";

export type ReportRow = {
  id: string;
  lat: number;
  lng: number;
  /** Bootstrap column — German default 'unbestätigt'. */
  status: string;
  /** Bootstrap column — TIMESTAMP, not Unix epoch. */
  created_at: string;
  nickname: string | null;
  plz: string | null;
};
