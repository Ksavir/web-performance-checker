// Configuración compartida entre servidor y cliente (sin imports de Node).
import type { PageType, Device, Rating, ValueFormat } from './types.ts';

export const PAGE_TYPES: { id: PageType; label: string }[] = [
  { id: 'homepage', label: 'Homepage' },
  { id: 'lobby', label: 'Lobby' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'login', label: 'Login' },
];

const KB = 1024;
const MB = 1024 * KB;

/** Dispositivos en el orden en que se prueban y se muestran (mobile primero). */
export const DEVICES: { id: Device; label: string; short: string }[] = [
  { id: 'mobile', label: 'Mobile', short: 'M' },
  { id: 'desktop', label: 'Desktop', short: 'D' },
];

export const getDeviceLabel = (device: Device): string => DEVICES.find((entry) => entry.id === device)?.label ?? device;

// Umbrales de "sobredimensionado" (propuestos; confirmar con el equipo).
export const THRESHOLDS = {
  imageBytes: 200 * KB,
  scriptBytes: 150 * KB,
  slowApiMs: 1000, // una petición API más lenta que esto se sugiere optimizar en el resumen
  verySlowApiMs: 3000, // ...y desde aquí, con prioridad alta
  pageBytes: 3 * MB, // peso total a partir del cual el resumen sugiere aligerar la página
  veryHeavyPageBytes: 6 * MB, // ...y desde aquí, con prioridad alta
};

// Prioridad de una sugerencia del resumen según lo que Lighthouse estima ahorrar.
export const PRIORITY_THRESHOLDS = {
  highMs: 300,
  highBytes: 500 * KB,
  mediumMs: 100,
  mediumBytes: 100 * KB,
  /** Imágenes o scripts pesados que suman más que esto merecen al menos prioridad media. */
  heavyGroupBytes: 1 * MB,
};

// Umbrales de Google (Core Web Vitals / Lighthouse).
export const RATINGS: Record<'score' | 'lcp' | 'fcp' | 'tbt' | 'cls', { good: number; poor: number; higherIsBetter?: boolean }> = {
  score: { good: 90, poor: 50, higherIsBetter: true },
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  tbt: { good: 200, poor: 600 },
  cls: { good: 0.1, poor: 0.25 },
};

/** Devuelve 'good' | 'ok' | 'poor' | 'none' */
export function rate(metric: string, value: number | null | undefined): Rating {
  const limits = RATINGS[metric as keyof typeof RATINGS];
  if (!limits || value == null) return 'none';
  if (limits.higherIsBetter) return value >= limits.good ? 'good' : value >= limits.poor ? 'ok' : 'poor';
  return value <= limits.good ? 'good' : value <= limits.poor ? 'ok' : 'poor';
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
