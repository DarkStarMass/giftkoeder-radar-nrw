import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="app-shell bg-paper font-sans text-ink">
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
        <main className="map-stage flex items-center justify-center">
          <p className="px-4 text-base font-medium text-ink">
            Karte und lokale Datenbank werden geladen…
          </p>
        </main>
      </div>
    );
  }

  return <App />;
}
