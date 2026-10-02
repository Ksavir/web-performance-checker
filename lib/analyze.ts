import { LCP_PHASES, OPPORTUNITIES, THRESHOLDS } from './config.ts';
import type { Diagnosis, Lhr, Opportunity, Request, TestResult } from './types.ts';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isApi = (r: Request) =>
  r.type === 'XHR' ||
  r.type === 'Fetch' ||
  /json/i.test(r.mime) ||
  (/\/(api|graphql|gql)(\/|\?|$)/i.test(safePath(r.url)) && !['Image', 'Script', 'Stylesheet', 'Font', 'Media'].includes(r.type));

function safePath(u: string) {
  try { return new URL(u).pathname + new URL(u).search; } catch { return u; }
}

const clip = (s: unknown, n: number) => { const t = String(s ?? ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const isHttp = (u: unknown): u is string => typeof u === 'string' && /^https?:/i.test(u);
const subItems = (i: any): any[] => i?.subItems?.items ?? [];

function formatTtl(ms: number) {
  if (!ms) return 'no cache';
  const h = ms / 3_600_000;
  return h >= 24 ? `cached ${Math.round(h / 24)} d` : h >= 1 ? `cached ${Math.round(h)} h` : `cached ${Math.round(ms / 60_000)} min`;
}

/** Texto corto por recurso, según la auditoría. */
function itemDetail(id: string, i: any): string | undefined {
  switch (id) {
    case 'image-delivery-insight': return subItems(i).map((s) => s.reason).filter(Boolean)[0];
    case 'unused-javascript':
    case 'unused-css-rules': return i.wastedPercent != null ? `${Math.round(i.wastedPercent)}% unused` : undefined;
    case 'legacy-javascript-insight': {
      const signals = [...new Set(subItems(i).map((s) => s.signal).filter(Boolean))];
      return signals.length ? signals.slice(0, 3).join(', ') + (signals.length > 3 ? ` +${signals.length - 3} more` : '') : undefined;
    }
    case 'duplicated-javascript-insight': return `in ${subItems(i).length} bundles`;
    case 'cache-insight': return formatTtl(num(i.cacheLifetimeMs));
    case 'modern-http-insight': return i.protocol ? `served over ${i.protocol}` : undefined;
    default: return undefined;
  }
}

/** Extrae el "por qué": fases del LCP, bloqueos de render, hilo principal y oportunidades. */
export function diagnose(a: Record<string, any>): Diagnosis {
  // LCP: tabla de fases + nodo del elemento
  const lcpParts: any[] = a['lcp-breakdown-insight']?.details?.items ?? [];
  const discovery: any[] = a['lcp-discovery-insight']?.details?.items ?? [];
  const phaseTable = lcpParts.find((p) => p.type === 'table');
  const node = lcpParts.find((p) => p.type === 'node') ?? discovery.find((p) => p.type === 'node');
  const phases = (phaseTable?.items ?? [])
    .filter((p: any) => typeof p.duration === 'number')
    .map((p: any) => ({ id: p.subpart, label: LCP_PHASES[p.subpart]?.label ?? p.label, duration: p.duration }));
  const lcp = phases.length || node
    ? {
      element: node ? { label: clip(node.nodeLabel, 120), selector: clip(node.selector, 200), snippet: clip(node.snippet, 300) } : null,
      phases,
    }
    : null;

  const renderBlocking = (a['render-blocking-insight']?.details?.items ?? [])
    .filter((i: any) => isHttp(i.url))
    .map((i: any) => ({ url: i.url, size: num(i.totalBytes), ms: num(i.wastedMs) }))
    .slice(0, 10);

  const mainThread = (a['bootup-time']?.details?.items ?? [])
    .filter((i: any) => isHttp(i.url))
    .slice(0, 5)
    .map((i: any) => ({ url: i.url, total: num(i.total), scripting: num(i.scripting), parse: num(i.scriptParseCompile) }));

  const tasks: any[] = a['long-tasks']?.details?.items ?? [];
  const longest = tasks.reduce((m, t) => (num(t.duration) > num(m?.duration) ? t : m), null as any);
  const longTasks = {
    count: tasks.length,
    totalMs: tasks.reduce((s, t) => s + num(t.duration), 0),
    longest: longest ? { url: String(longest.url || 'Unattributable'), duration: num(longest.duration) } : null,
  };

  const opportunities: Opportunity[] = [];
  for (const [id, meta] of Object.entries(OPPORTUNITIES)) {
    const audit = a[id];
    if (!audit || audit.score === 1 || audit.score == null) continue;
    const raw: any[] = audit.details?.items ?? [];
    const items = raw
      .map((i) => ({
        url: String(i.url ?? i.source ?? ''),
        wasted: typeof i.wastedBytes === 'number' ? i.wastedBytes : undefined,
        wastedMs: typeof i.wastedMs === 'number' ? i.wastedMs : undefined,
        detail: itemDetail(id, i),
      }))
      .filter((i) => i.url)
      .slice(0, 5);
    const bytes = audit.details?.overallSavingsBytes ?? raw.reduce((s, i) => s + num(i.wastedBytes), 0);
    const [metric, ms] = Object.entries(audit.metricSavings ?? {})
      .filter(([k]) => k !== 'CLS')
      .reduce((best, cur) => (num(cur[1]) > num(best[1]) ? cur : best), ['', 0] as [string, unknown]);
    const opp: Opportunity = { id, title: meta.title, items };
    if (bytes > 0) opp.savingsBytes = bytes;
    if (num(ms) > 0) { opp.savingsMs = num(ms); opp.metric = metric; }
    // Algunos insights no estiman ahorro pero igual fallan (p. ej. fuentes): se muestran si tienen recursos.
    if (opp.savingsBytes || opp.savingsMs || items.length) opportunities.push(opp);
  }
  opportunities.sort((x, y) => num(y.savingsMs) - num(x.savingsMs) || num(y.savingsBytes) - num(x.savingsBytes));

  return { lcp, renderBlocking, mainThread, longTasks, opportunities };
}

/**
 * Convierte el informe (LHR) de Lighthouse en el resultado que usa la app.
 * Es una función pura: se puede probar sin Chrome.
 */
export function extract(lhr: Lhr, requestedUrl?: string): TestResult {
  if (lhr.runtimeError) {
    throw new Error(`Lighthouse error: ${lhr.runtimeError.message || lhr.runtimeError.code}`);
  }
  const a = lhr.audits || {};
  const perf = lhr.categories?.performance?.score;
  if (perf == null) {
    throw new Error('Lighthouse could not compute a performance score. The page may have failed to load or blocked the test (anti-bot, geo-block, age gate).');
  }

  const items: any[] = a['network-requests']?.details?.items ?? [];
  const reqs = items
    .filter((i) => i.url && !i.url.startsWith('data:'))
    .map((i): Request => {
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

  // Motivo por imagen (tamaño mostrado, formato) y bytes sin usar por script, para dar el "por qué" en cada fila.
  const imageHints = new Map<string, { hint?: string; wasted: number }>();
  for (const i of a['image-delivery-insight']?.details?.items ?? []) {
    imageHints.set(i.url, { hint: subItems(i).map((s) => s.reason).filter(Boolean).join(' '), wasted: num(i.wastedBytes) });
  }
  const unusedJs = new Map<string, number>((a['unused-javascript']?.details?.items ?? []).map((i: any) => [i.url, num(i.wastedBytes)]));

  const bigImages = reqs
    .filter((r) => r.type === 'Image' && r.size > THRESHOLDS.imageBytes)
    .sort((x, y) => y.size - x.size)
    .slice(0, 15)
    .map(({ url, size, mime }) => {
      const h = imageHints.get(url);
      return { url, size, mime, ...(h?.hint ? { hint: clip(h.hint, 260) } : {}), ...(h?.wasted ? { wasted: h.wasted } : {}) };
    });

  const bigScripts = reqs
    .filter((r) => r.type === 'Script' && r.size > THRESHOLDS.scriptBytes)
    .sort((x, y) => y.size - x.size)
    .slice(0, 15)
    .map(({ url, size }) => (unusedJs.get(url) ? { url, size, unused: unusedJs.get(url) } : { url, size }));

  // Ahorros estimados (solo si Lighthouse los reporta en esta versión)
  const savings: TestResult['findings']['savings'] = {};
  const s = (id: string) => a[id]?.details?.overallSavingsBytes;
  if (s('unused-javascript') != null) savings.unusedJs = s('unused-javascript');
  if (s('unminified-javascript') != null) savings.unminifiedJs = s('unminified-javascript');
  // Lighthouse 13 unificó tamaño y formato de imágenes en un solo insight.
  if (imageHints.size) savings.oversizedImages = [...imageHints.values()].reduce((t, h) => t + h.wasted, 0);

  const warnings = [...(lhr.runWarnings || [])];
  const doc = reqs.find((r) => r.type === 'Document');
  if (doc && doc.status != null && doc.status >= 400) {
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
    findings: { slowApis, bigImages, bigScripts, savings, diagnosis: diagnose(a) },
    warnings,
  };
}

/** Elige la corrida con la mediana del score (evita mezclar métricas de corridas distintas). */
export function pickMedian<T extends { score: number }>(results: T[]): T {
  const sorted = [...results].sort((x, y) => x.score - y.score);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}
