import { THRESHOLDS } from './config.js';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isApi = (r) =>
  r.type === 'XHR' ||
  r.type === 'Fetch' ||
  /json/i.test(r.mime) ||
  (/\/(api|graphql|gql)(\/|\?|$)/i.test(safePath(r.url)) && !['Image', 'Script', 'Stylesheet', 'Font', 'Media'].includes(r.type));

function safePath(u) {
  try { return new URL(u).pathname + new URL(u).search; } catch { return u; }
}

/**
 * Convierte el informe (LHR) de Lighthouse en el resultado que usa la app.
 * Es una función pura: se puede probar sin Chrome.
 */
export function extract(lhr, requestedUrl) {
  if (lhr.runtimeError) {
    throw new Error(`Lighthouse error: ${lhr.runtimeError.message || lhr.runtimeError.code}`);
  }
  const a = lhr.audits || {};
  const perf = lhr.categories?.performance?.score;
  if (perf == null) {
    throw new Error('Lighthouse could not compute a performance score. The page may have failed to load or blocked the test (anti-bot, geo-block, age gate).');
  }

  const items = a['network-requests']?.details?.items ?? [];
  const reqs = items
    .filter((i) => i.url && !i.url.startsWith('data:'))
    .map((i) => {
      const start = num(i.networkRequestTime ?? i.startTime);
      const end = num(i.networkEndTime ?? i.endTime);
      const transfer = num(i.transferSize);
      const resource = num(i.resourceSize);
      return {
        url: i.url,
        type: i.resourceType || 'Other',
        mime: i.mimeType || '',
        status: i.statusCode,
        duration: Math.max(0, end - start),
        transfer,
        resource,
        size: transfer || resource,
      };
    });

  const pageSize = a['total-byte-weight']?.numericValue ?? reqs.reduce((s, r) => s + r.transfer, 0);

  const slowApis = reqs
    .filter(isApi)
    .sort((x, y) => y.duration - x.duration)
    .slice(0, 5)
    .map(({ url, duration, status, size, type }) => ({ url, duration, status, size, type }));

  const bigImages = reqs
    .filter((r) => r.type === 'Image' && r.size > THRESHOLDS.imageBytes)
    .sort((x, y) => y.size - x.size)
    .slice(0, 15)
    .map(({ url, size, mime }) => ({ url, size, mime }));

  const bigScripts = reqs
    .filter((r) => r.type === 'Script' && r.size > THRESHOLDS.scriptBytes)
    .sort((x, y) => y.size - x.size)
    .slice(0, 15)
    .map(({ url, size }) => ({ url, size }));

  // Ahorros estimados (solo si Lighthouse los reporta en esta versión)
  const savings = {};
  const s = (id) => a[id]?.details?.overallSavingsBytes;
  if (s('unused-javascript') != null) savings.unusedJs = s('unused-javascript');
  if (s('unminified-javascript') != null) savings.unminifiedJs = s('unminified-javascript');
  if (s('uses-responsive-images') != null) savings.oversizedImages = s('uses-responsive-images');
  if (s('modern-image-formats') != null) savings.modernImageFormats = s('modern-image-formats');

  const warnings = [...(lhr.runWarnings || [])];
  const doc = reqs.find((r) => r.type === 'Document');
  if (doc && doc.status >= 400) {
    warnings.push(`Main document returned HTTP ${doc.status}. The site may be blocking automated tests (anti-bot, geo-block).`);
  }
  if (requestedUrl && lhr.finalDisplayedUrl) {
    try {
      const a1 = new URL(requestedUrl), b1 = new URL(lhr.finalDisplayedUrl);
      if (a1.origin + a1.pathname.replace(/\/$/, '') !== b1.origin + b1.pathname.replace(/\/$/, '')) {
        warnings.push(`The page redirected to ${lhr.finalDisplayedUrl}. Results describe that page (e.g. an age gate or login redirect).`);
      }
    } catch { /* ignore */ }
  }

  return {
    score: Math.round(perf * 100),
    lcp: a['largest-contentful-paint']?.numericValue ?? null,
    fcp: a['first-contentful-paint']?.numericValue ?? null,
    tbt: a['total-blocking-time']?.numericValue ?? null,
    cls: a['cumulative-layout-shift']?.numericValue ?? null,
    pageSize,
    requestCount: reqs.length,
    findings: { slowApis, bigImages, bigScripts, savings },
    warnings,
  };
}

/** Elige la corrida con la mediana del score (evita mezclar métricas de corridas distintas). */
export function pickMedian(results) {
  const sorted = [...results].sort((x, y) => x.score - y.score);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}
