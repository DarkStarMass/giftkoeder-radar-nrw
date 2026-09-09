import { useEffect, useId, useState } from "react";
import { isInsideNrw } from "@/map/nrw";
import { isFiveDigit, isLikelyNrwPlz } from "./plz";

export type DraftCoord = { lat: number; lng: number } | null;

type Props = {
  open: boolean;
  coord: DraftCoord;
  locating: boolean;
  onClose: () => void;
  onRequestLocation: () => void;
  onSubmit: (input: { nickname: string; plz: string }) => Promise<void>;
};

const NICK_KEY = "giftkoeder-nickname";

export function ReportSheet({
  open,
  coord,
  locating,
  onClose,
  onRequestLocation,
  onSubmit,
}: Props) {
  const titleId = useId();
  const [nickname, setNickname] = useState("");
  const [plz, setPlz] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    try {
      const saved = localStorage.getItem(NICK_KEY);
      if (saved) setNickname(saved);
    } catch {
      /* localStorage may be blocked */
    }
  }, [open]);

  if (!open) return null;

  const plzOk = isLikelyNrwPlz(plz);
  const coordOk = coord ? isInsideNrw(coord.lat, coord.lng) : false;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const name = nickname.trim();
    if (name.length < 2) {
      setError("Bitte einen Spitznamen mit mindestens 2 Zeichen.");
      return;
    }
    if (!isFiveDigit(plz)) {
      setError("PLZ muss fünf Ziffern haben.");
      return;
    }
    if (!plzOk) {
      setError("PLZ liegt vermutlich nicht in NRW (temporäre Prüfung).");
      return;
    }
    if (!coord) {
      setError("Bitte auf die Karte tippen oder den Standort bestimmen.");
      return;
    }
    if (!coordOk) {
      setError("Koordinate liegt außerhalb von NRW (Schätzung der Bounding Box).");
      return;
    }
    setBusy(true);
    try {
      try {
        localStorage.setItem(NICK_KEY, name);
      } catch {
        /* ignore */
      }
      await onSubmit({ nickname: name, plz: plz.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-auto flex max-h-[54dvh] w-full max-w-lg flex-col overflow-auto rounded-t-xl border-t border-earth/30 bg-paper text-ink shadow-[0_-8px_40px_rgba(38,31,25,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-earth/30 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-moss">
              Lokal · ohne Login
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold leading-tight">
              Fund melden
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md text-ink hover:bg-earth/20 touch-manipulation"
            aria-label="Schließen"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <p className="text-sm leading-normal text-ink-soft">
            Tippe auf die Karte oder nutze deinen Standort. Die Meldung bleibt in
            diesem Browser (PGLite) — kein Serverzwang, kein Konto.
          </p>

          <div className="rounded-md border border-earth/40 bg-paper px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-earth">
              Koordinate
            </p>
            <p className="mt-1 font-medium tabular-nums">
              {coord
                ? `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`
                : "Noch keine Position"}
            </p>
            {coord && !coordOk ? (
              <p className="mt-1 text-sm text-threat-dark">Außerhalb NRW (Schätzung).</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onRequestLocation}
            disabled={locating}
            className="flex min-h-16 items-center justify-center gap-2 rounded-md border-2 border-moss bg-paper px-4 text-base font-semibold text-moss touch-manipulation hover:bg-moss/10 disabled:opacity-60"
          >
            {locating ? "Ortung läuft…" : "Standort bestimmen"}
          </button>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Spitzname</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 40))}
              autoComplete="nickname"
              name="nickname"
              className="min-h-16 rounded-md border border-earth/50 bg-paper px-4 text-lg text-ink outline-none ring-moss/40 focus:border-moss focus:ring-2"
              placeholder="z. B. Waldläufer"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Postleitzahl (NRW, temporär)</span>
            <input
              value={plz}
              onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              name="plz"
              maxLength={5}
              className="min-h-16 rounded-md border border-earth/50 bg-paper px-4 text-lg tabular-nums text-ink outline-none ring-moss/40 focus:border-moss focus:ring-2"
              placeholder="40789"
            />
            {plz.length === 5 && !plzOk ? (
              <span className="text-sm text-threat-dark">
                Präfix nicht in der groben NRW-Liste.
              </span>
            ) : null}
          </label>

          {error ? (
            <p role="alert" className="rounded-md bg-threat/10 px-3 py-2 text-sm text-threat-dark">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-16 items-center justify-center rounded-md bg-moss px-4 text-lg font-semibold text-paper touch-manipulation hover:bg-moss-dark disabled:opacity-60"
          >
            {busy ? "Speichert…" : "Lokal speichern"}
          </button>
        </form>
      </section>
    </div>
  );
}
