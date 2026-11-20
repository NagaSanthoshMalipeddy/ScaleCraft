export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="3" y="5" width="58" height="56" rx="14" className="logo-drop" />
      <rect x="2" y="2" width="58" height="56" rx="14" className="logo-bg" />
      <path d="M31 11 47 20 31 29 15 20Z" className="logo-top" />
      <path d="M15 20v10l16 9V29Z" className="logo-left" />
      <path d="M47 20v10l-16 9V29Z" className="logo-right" />
      <path d="M15 36v6l16 9 16-9v-6" className="logo-rust" />
    </svg>
  );
}
