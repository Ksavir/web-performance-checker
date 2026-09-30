// Configuración compartida entre servidor y cliente (sin imports de Node).

export const PAGE_TYPES = [
  { id: 'homepage', label: 'Homepage' },
  { id: 'lobby', label: 'Lobby' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'login', label: 'Login' },
];

export const DEVICES = [
  { id: 'mobile', label: 'Mobile' },
  { id: 'desktop', label: 'Desktop' },
];

// Umbrales de "sobredimensionado" (propuestos; confirmar con el equipo).
export const THRESHOLDS = {
  imageBytes: 200 * 1024,
  scriptBytes: 150 * 1024,
};

// Umbrales de Google (Core Web Vitals / Lighthouse).
export const RATINGS = {
  score: { good: 90, poor: 50, higherIsBetter: true },
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  tbt: { good: 200, poor: 600 },
  cls: { good: 0.1, poor: 0.25 },
};

/** Devuelve 'good' | 'ok' | 'poor' | 'none' */
export function rate(metric, value) {
  const r = RATINGS[metric];
  if (!r || value == null) return 'none';
  if (r.higherIsBetter) return value >= r.good ? 'good' : value >= r.poor ? 'ok' : 'poor';
  return value <= r.good ? 'good' : value <= r.poor ? 'ok' : 'poor';
}

export const METRICS = [
  { key: 'lcp', label: 'Largest Contentful Paint', short: 'LCP', fmt: 'ms' },
  { key: 'fcp', label: 'First Contentful Paint', short: 'FCP', fmt: 'ms' },
  { key: 'tbt', label: 'Total Blocking Time', short: 'TBT', fmt: 'ms' },
  { key: 'cls', label: 'Cumulative Layout Shift', short: 'CLS', fmt: 'cls' },
  { key: 'pageSize', label: 'Page size', short: 'Size', fmt: 'bytes' },
  { key: 'requestCount', label: 'Requests', short: 'Req', fmt: 'int' },
];

export function formatValue(fmt, v) {
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

export function formatBytes(b) {
  if (b == null) return '–';
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}
