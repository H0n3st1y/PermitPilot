/** The folded permit and upward route are shared by the app and install assets. */
export function PermitPilotLogo({
  size = 36,
  wordmark = true,
  decorative = false,
  className = "",
}: {
  size?: number;
  wordmark?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <span className={`brand-logo ${className}`} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "PermitPilot"} aria-hidden={decorative || undefined}>
      <svg className="brand-logo-mark" width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
        <path d="M7 2h13l8 8v17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" fill="var(--navy, #153a56)" />
        <path d="M20 2v6a2 2 0 0 0 2 2h6L20 2Z" fill="var(--seal, #ad4f20)" />
        <path d="M10 24v-5a5 5 0 0 1 5-5h7m-4-4 4 4-4 4" stroke="var(--card, #fffcf6)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {wordmark ? <span className="brand-logo-wordmark">PermitPilot</span> : null}
    </span>
  );
}
