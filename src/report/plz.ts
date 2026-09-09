/**
 * Temporary NRW PLZ check — 5 digits + coarse prefix list.
 * Not an official register. Stop here (Time-Blindness Auditor).
 */
const NRW_PREFIXES = new Set([
  "32",
  "33",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "50",
  "51",
  "52",
  "53",
  "57",
  "58",
  "59",
]);

export function isFiveDigit(plz: string): boolean {
  return /^\d{5}$/.test(plz.trim());
}

export function isLikelyNrwPlz(plz: string): boolean {
  const value = plz.trim();
  if (!isFiveDigit(value)) return false;
  return NRW_PREFIXES.has(value.slice(0, 2));
}
