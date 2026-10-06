// Iconos de trazo de la interfaz. Todos heredan el color del texto (currentColor) y son decorativos.
const ICONS = {
  chart: { viewBox: 24, strokeWidth: 1.8, shape: <path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" /> },
  list: { viewBox: 24, strokeWidth: 1.8, shape: <path d="M5 6h14M5 12h14M5 18h9" /> },
  trash: { viewBox: 24, strokeWidth: 1.8, shape: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /> },
  copy: { viewBox: 24, strokeWidth: 1.8, shape: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></> },
  check: { viewBox: 16, strokeWidth: 2, shape: <path d="M3 8.5l3.2 3L13 4.5" /> },
  checkBold: { viewBox: 16, strokeWidth: 2.2, shape: <path d="M3 8.5l3.2 3L13 4.5" /> },
  image: { viewBox: 24, strokeWidth: 1.8, shape: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 9" /></> },
  mobile: { viewBox: 24, strokeWidth: 1.8, shape: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></> },
  desktop: { viewBox: 24, strokeWidth: 1.8, shape: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></> },
};

export default function Icon({ name, size = 16 }) {
  const { viewBox, strokeWidth, shape } = ICONS[name];
  return (
    <svg viewBox={`0 0 ${viewBox} ${viewBox}`} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shape}
    </svg>
  );
}
