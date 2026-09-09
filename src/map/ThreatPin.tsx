type Props = {
  label: string;
  onSelect?: () => void;
};

export function ThreatPin({ label, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      className="relative flex h-16 w-16 items-center justify-center touch-manipulation"
      aria-label={label}
    >
      <span
        className="threat-pulse pointer-events-none absolute inset-1 rounded-full bg-threat"
        aria-hidden="true"
      />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-paper bg-threat text-paper shadow-[0_2px_10px_rgba(38,31,25,0.35)]">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="m10.3 4.7-7.1 12.3A2 2 0 0 0 4.9 20h14.2a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
    </button>
  );
}
