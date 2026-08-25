export function Wordmark({ className = "" }: { className?: string }) {
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="10" stroke="currentColor" strokeOpacity="0.35" />
          <path d="M11 11 L11 1 A10 10 0 0 1 19.5 6.3 Z" fill="#E8C46A" />
          <circle cx="11" cy="11" r="1.6" fill="#E8C46A" />
        </svg>
        <span className="font-display text-lg font-medium tracking-tight">Pharos</span>
      </span>
    );
  }