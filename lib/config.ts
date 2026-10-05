// Configuración compartida entre servidor y cliente (sin imports de Node).
import type { PageType, Device, Rating, ValueFormat } from './types.ts';

export const PAGE_TYPES: { id: PageType; label: string }[] = [
  { id: 'homepage', label: 'Homepage' },
  { id: 'lobby', label: 'Lobby' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'login', label: 'Login' },
];

export const DEVICES: { id: Device; label: string }[] = [
  { id: 'mobile', label: 'Mobile' },
  { id: 'desktop', label: 'Desktop' },
];

// Umbrales de "sobredimensionado" (propuestos; confirmar con el equipo).
export const THRESHOLDS = {
  imageBytes: 200 * 1024,
  scriptBytes: 150 * 1024,
  slowApiMs: 1000, // una petición API más lenta que esto se sugiere optimizar en el resumen
  pageBytes: 3 * 1024 * 1024, // peso total a partir del cual el resumen sugiere aligerar la página
};

// Umbrales de Google (Core Web Vitals / Lighthouse).
export const RATINGS: Record<string, { good: number; poor: number; higherIsBetter?: boolean }> = {
  score: { good: 90, poor: 50, higherIsBetter: true },
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  tbt: { good: 200, poor: 600 },
  cls: { good: 0.1, poor: 0.25 },
};

/** Devuelve 'good' | 'ok' | 'poor' | 'none' */
export function rate(metric: string, value: number | null | undefined): Rating {
  const r = RATINGS[metric];
  if (!r || value == null) return 'none';
  if (r.higherIsBetter) return value >= r.good ? 'good' : value >= r.poor ? 'ok' : 'poor';
  return value <= r.good ? 'good' : value <= r.poor ? 'ok' : 'poor';
}

export const METRICS: { key: 'lcp' | 'fcp' | 'tbt' | 'cls' | 'pageSize' | 'requestCount'; label: string; short: string; fmt: ValueFormat }[] = [
  { key: 'lcp', label: 'Largest Contentful Paint', short: 'LCP', fmt: 'ms' },
  { key: 'fcp', label: 'First Contentful Paint', short: 'FCP', fmt: 'ms' },
  { key: 'tbt', label: 'Total Blocking Time', short: 'TBT', fmt: 'ms' },
  { key: 'cls', label: 'Cumulative Layout Shift', short: 'CLS', fmt: 'cls' },
  { key: 'pageSize', label: 'Page size', short: 'Size', fmt: 'bytes' },
  { key: 'requestCount', label: 'Requests', short: 'Req', fmt: 'int' },
];

// Fases del LCP en orden, con el consejo para cuando es la fase dominante.
export const LCP_PHASES: Record<string, { label: string; tip: string }> = {
  timeToFirstByte: {
    label: 'Time to first byte',
    tip: 'The server is slow to send the HTML. Cache the page at the CDN/edge, and check backend and redirect time.',
  },
  resourceLoadDelay: {
    label: 'Load delay',
    tip: 'The browser finds the LCP resource late. Put it in the initial HTML (not injected by JS), preload it and add fetchpriority="high".',
  },
  resourceLoadDuration: {
    label: 'Load time',
    tip: 'The LCP resource is heavy. Resize it to its displayed size, serve AVIF/WebP and deliver it from a CDN.',
  },
  elementRenderDelay: {
    label: 'Render delay',
    tip: 'The resource is ready but paints late. Cut render-blocking CSS/JS and long main-thread tasks (hydration, sliders, consent banners).',
  },
};

// Auditorías de Lighthouse que se muestran como oportunidades, con un consejo concreto.
export const OPPORTUNITIES: Record<string, { title: string; tip: string }> = {
  'unused-javascript': {
    title: 'Reduce unused JavaScript',
    tip: 'Split bundles by route and lazy-load heavy widgets (game grids, live chat, sliders) when they are needed.',
  },
  'image-delivery-insight': {
    title: 'Improve image delivery',
    tip: 'Serve images at their displayed size with srcset/sizes, in AVIF or WebP, and well compressed.',
  },
  'legacy-javascript-insight': {
    title: 'Stop shipping legacy JavaScript',
    tip: 'Polyfills and transpiled code for old browsers. Target modern browsers in browserslist (Babel/SWC).',
  },
  'duplicated-javascript-insight': {
    title: 'Remove duplicated JavaScript',
    tip: 'The same module is bundled more than once. Dedupe dependency versions and share common chunks.',
  },
  'unused-css-rules': {
    title: 'Reduce unused CSS',
    tip: 'Remove unused rules or split CSS per page, and inline only the critical CSS.',
  },
  'unminified-javascript': {
    title: 'Minify JavaScript',
    tip: 'Enable minification in the production build (Terser, esbuild or SWC).',
  },
  'unminified-css': {
    title: 'Minify CSS',
    tip: 'Enable CSS minification in the production build.',
  },
  'cache-insight': {
    title: 'Use longer cache lifetimes',
    tip: 'Give static, fingerprinted assets Cache-Control: max-age=31536000, immutable. Repeat visits load them from disk.',
  },
  'font-display-insight': {
    title: 'Show text while web fonts load',
    tip: 'Add font-display: swap (or optional) to @font-face and preload the main font file.',
  },
  'modern-http-insight': {
    title: 'Use HTTP/2 or HTTP/3',
    tip: 'Some origins still use HTTP/1.1. Serve them over HTTP/2+ so requests are multiplexed.',
  },
};

export function formatValue(fmt: ValueFormat, v: number | null | undefined): string {
  if (v == null) return '–';
  switch (fmt) {
    case 'ms':
      return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
    case 'cls':
      return v.toFixed(3);
    case 'bytes':
      return formatBytes(v);
    default:
      return String(Math.round(v));
  }
}

export function formatBytes(b: number | null | undefined): string {
  if (b == null) return '–';
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}
