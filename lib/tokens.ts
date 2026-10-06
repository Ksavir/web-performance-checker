// Tokens de diseño: la misma paleta que las variables de :root en app/globals.css.
// El PDF los usa directamente; tokens.test.ts comprueba que ambos sitios no se desincronicen.

export const COLORS = {
  bg: '#eceff2',
  panel: '#ffffff',
  ink: '#1c2430',
  muted: '#5f6b7a',
  faint: '#8b95a3',
  line: '#e1e5ea',
  lineStrong: '#c9d0d8',
  sunken: '#f3f5f7',
  accent: '#3d5a78',
  accentHover: '#314b66',
  accentSoft: '#e6ecf2',
  onAccent: '#ffffff',
  good: '#3f7f6a',
  ok: '#a97f2c',
  poor: '#b0504a',
  goodSoft: '#e5f0ec',
  okSoft: '#f6efdf',
  poorSoft: '#f6e6e4',
  goodInk: '#25503f',
  poorInk: '#692a25',
  poorHover: '#983f39',
  okBorder: '#e6d8b4',
  poorBorder: '#e6c4c0',
  // Colores de las cifras de las métricas, elegidos por el equipo (estilo Google).
  vitalGood: '#34a853',
  vitalOk: '#fbbc05',
  vitalPoor: '#ea4335',
} as const;

export const RADII = {
  radius2xs: '3px',
  radiusXs: '6px',
  radiusSm: '9px',
  radiusTab: '10px',
  radius: '14px',
  radiusPill: '999px',
} as const;

export type ColorToken = keyof typeof COLORS;
