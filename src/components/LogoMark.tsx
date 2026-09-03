export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  const azul = "var(--color-brand, #1E9BD7)";
  const oscuro = "var(--color-brand-ink, #1E293B)";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="0" y="0" width="5" height="16" fill={oscuro} />
      <rect x="12" y="0" width="12" height="5" fill={azul} />
      <path d="M6 11 L12 22 L18 11 L14.5 11 L12 16 L9.5 11 Z" fill={azul} />
      <rect x="19" y="19" width="5" height="5" fill={oscuro} />
      <rect x="0" y="19" width="11" height="5" fill={azul} />
    </svg>
  );
}
