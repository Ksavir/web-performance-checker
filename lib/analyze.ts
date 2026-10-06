import { LCP_PHASES, OPPORTUNITIES, THRESHOLDS } from './config.ts';
import type { Diagnosis, Findings, Lhr, LhrAudit, LhrItem, Opportunity, Request, TestResult } from './types.ts';

type Audits = NonNullable<Lhr['audits']>;

// Cuántos elementos se guardan por hallazgo: suficientes para actuar sin llenar el historial del navegador.
const MAX_SLOW_APIS = 5;
const MAX_BIG_RESOURCES = 15;
const MAX_RENDER_BLOCKING = 10;
const MAX_MAIN_THREAD = 5;
const MAX_ITEMS_PER_OPPORTUNITY = 5;
const MAX_LEGACY_SIGNALS = 3;
// Longitud máxima de los textos que vienen del DOM de la página probada.
const MAX_LABEL_CHARS = 120;
const MAX_SELECTOR_CHARS = 200;
const MAX_SNIPPET_CHARS = 300;
const MAX_HINT_CHARS = 260;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const HOURS_PER_DAY = 24;
const NON_API_TYPES = ['Image', 'Script', 'Stylesheet', 'Font', 'Media'];

const toNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const isHttp = (url: unknown): url is string => typeof url === 'string' && /^https?:/i.test(url);
const asList = (items: LhrItem['items']): LhrItem[] => (Array.isArray(items) ? items : []);
const itemsOf = (audit: LhrAudit | undefined): LhrItem[] => asList(audit?.details?.items);
const subItemsOf = (item: LhrItem) => item.subItems?.items ?? [];

function truncate(value: unknown, maxLength: number) {
  const text = String(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function pathWithSearch(url: string) {
  try { const parsed = new URL(url); return parsed.pathname + parsed.search; } catch { return url; }
}

// XHR/fetch, respuestas JSON o rutas de API que no sean recursos estáticos.
const isApiRequest = (request: Request) =>
  request.type === 'XHR'
  || request.type === 'Fetch'
  || /json/i.test(request.mime)
  || (/\/(api|graphql|gql)(\/|\?|$)/i.test(pathWithSearch(request.url)) && !NON_API_TYPES.includes(request.type));

function formatTtl(ms: number) {
  if (!ms) return 'no cache';
  const hours = ms / MS_PER_HOUR;
  if (hours >= HOURS_PER_DAY) return `cached ${Math.round(hours / HOURS_PER_DAY)} d`;
  if (hours >= 1) return `cached ${Math.round(hours)} h`;
  return `cached ${Math.round(ms / MS_PER_MINUTE)} min`;
}

function describeLegacySignals(item: LhrItem) {
  const signals = [...new Set(subItemsOf(item).map((sub) => sub.signal).filter(Boolean))];
  if (!signals.length) return undefined;
  const extra = signals.length > MAX_LEGACY_SIGNALS ? ` +${signals.length - MAX_LEGACY_SIGNALS} more` : '';
  return signals.slice(0, MAX_LEGACY_SIGNALS).join(', ') + extra;
}

/** Texto corto por recurso, según la auditoría. */
function describeItem(auditId: string, item: LhrItem): string | undefined {
  switch (auditId) {
    case 'image-delivery-insight': return subItemsOf(item).map((sub) => sub.reason).find(Boolean);
    case 'unused-javascript':
    case 'unused-css-rules': return item.wastedPercent != null ? `${Math.round(item.wastedPercent)}% unused` : undefined;
    case 'legacy-javascript-insight': return describeLegacySignals(item);
    case 'duplicated-javascript-insight': return `in ${subItemsOf(item).length} bundles`;
    case 'cache-insight': return formatTtl(toNumber(item.cacheLifetimeMs));
    case 'modern-http-insight': return item.protocol ? `served over ${item.protocol}` : undefined;
    default: return undefined;
  }
}

function buildLcpDiagnosis(audits: Audits): Diagnosis['lcp'] {
  const breakdown = itemsOf(audits['lcp-breakdown-insight']);
  const discovery = itemsOf(audits['lcp-discovery-insight']);
  const phaseTable = breakdown.find((part) => part.type === 'table');
  const node = breakdown.find((part) => part.type === 'node') ?? discovery.find((part) => part.type === 'node');
  const phases = asList(phaseTable?.items)
    .filter((phase) => typeof phase.duration === 'number')
    .map((phase) => {
      const id = phase.subpart ?? '';
      return { id, label: LCP_PHASES[id]?.label ?? phase.label ?? id, duration: toNumber(phase.duration) };
    });
  if (!phases.length && !node) return null;
  const element = node
    ? { label: truncate(node.nodeLabel, MAX_LABEL_CHARS), selector: truncate(node.selector, MAX_SELECTOR_CHARS), snippet: truncate(node.snippet, MAX_SNIPPET_CHARS) }
    : null;
  return { element, phases };
}

function buildLongTasks(audits: Audits): Diagnosis['longTasks'] {
  const tasks = itemsOf(audits['long-tasks']);
  const longest = tasks.reduce<LhrItem | null>((max, task) => (toNumber(task.duration) > toNumber(max?.duration) ? task : max), null);
  return {
    count: tasks.length,
    totalMs: tasks.reduce((sum, task) => sum + toNumber(task.duration), 0),
    longest: longest ? { url: String(longest.url || 'Unattributable'), duration: toNumber(longest.duration) } : null,
  };
}

/** La métrica con más ahorro estimado (sin CLS, que no se mide en tiempo). */
function pickBestTimeSaving(metricSavings: LhrAudit['metricSavings'] = {}) {
  return Object.entries(metricSavings)
    .filter(([metric]) => metric !== 'CLS')
    .reduce((best, [metric, ms]) => (toNumber(ms) > best.ms ? { metric, ms: toNumber(ms) } : best), { metric: '', ms: 0 });
}

function buildOpportunity(auditId: string, audit: LhrAudit): Opportunity | null {
  const rawItems = itemsOf(audit);
  const items = rawItems
    .map((item) => ({
      url: String(item.url ?? item.source ?? ''),
      wasted: typeof item.wastedBytes === 'number' ? item.wastedBytes : undefined,
      wastedMs: typeof item.wastedMs === 'number' ? item.wastedMs : undefined,
      detail: describeItem(auditId, item),
    }))
    .filter((item) => item.url)
    .slice(0, MAX_ITEMS_PER_OPPORTUNITY);
  const bytes = audit.details?.overallSavingsBytes ?? rawItems.reduce((sum, item) => sum + toNumber(item.wastedBytes), 0);
  const timeSaving = pickBestTimeSaving(audit.metricSavings);

  const opportunity: Opportunity = { id: auditId, title: OPPORTUNITIES[auditId].title, items };
  if (bytes > 0) opportunity.savingsBytes = bytes;
  if (timeSaving.ms > 0) {
    opportunity.savingsMs = timeSaving.ms;
    opportunity.metric = timeSaving.metric;
  }
  // Algunos insights no estiman ahorro pero igual fallan (p. ej. fuentes): se muestran si tienen recursos.
  const hasSomethingToShow = opportunity.savingsBytes || opportunity.savingsMs || items.length;
  return hasSomethingToShow ? opportunity : null;
}

function buildOpportunities(audits: Audits): Opportunity[] {
  return Object.keys(OPPORTUNITIES)
    .flatMap((auditId) => {
      const audit = audits[auditId];
      const failed = audit && audit.score != null && audit.score !== 1;
      const opportunity = failed ? buildOpportunity(auditId, audit) : null;
      return opportunity ? [opportunity] : [];
    })
    .sort((x, y) => toNumber(y.savingsMs) - toNumber(x.savingsMs) || toNumber(y.savingsBytes) - toNumber(x.savingsBytes));
}

/** Extrae el "por qué": fases del LCP, bloqueos de render, hilo principal y oportunidades. */
export function diagnose(audits: Audits): Diagnosis {
  const renderBlocking = itemsOf(audits['render-blocking-insight'])
    .filter((item) => isHttp(item.url))
    .map((item) => ({ url: String(item.url), size: toNumber(item.totalBytes), ms: toNumber(item.wastedMs) }))
    .slice(0, MAX_RENDER_BLOCKING);

  const mainThread = itemsOf(audits['bootup-time'])
    .filter((item) => isHttp(item.url))
    .slice(0, MAX_MAIN_THREAD)
    .map((item) => ({ url: String(item.url), total: toNumber(item.total), scripting: toNumber(item.scripting), parse: toNumber(item.scriptParseCompile) }));

  return {
    lcp: buildLcpDiagnosis(audits),
    renderBlocking,
    mainThread,
    longTasks: buildLongTasks(audits),
    opportunities: buildOpportunities(audits),
  };
}

export function normalizeRequests(audits: Audits): Request[] {
  return itemsOf(audits['network-requests'])
    .filter((item): item is LhrItem & { url: string } => typeof item.url === 'string' && !item.url.startsWith('data:'))
    .map((item) => {
      const start = toNumber(item.networkRequestTime ?? item.startTime);
      const end = toNumber(item.networkEndTime ?? item.endTime);
      const transfer = toNumber(item.transferSize);
      const resource = toNumber(item.resourceSize);
      return {
        url: item.url,
        type: item.resourceType || 'Other',
        mime: item.mimeType || '',
        status: item.statusCode,
        duration: Math.max(0, end - start),
        transfer,
        resource,
        size: transfer || resource,
      };
    });
}

export function findSlowApis(requests: Request[]): Findings['slowApis'] {
  return requests
    .filter(isApiRequest)
    .sort((x, y) => y.duration - x.duration)
    .slice(0, MAX_SLOW_APIS)
    .map(({ url, duration, status, size, type }) => ({ url, duration, status, size, type }));
}

const largestOfType = (requests: Request[], type: string, minBytes: number) => requests
  .filter((request) => request.type === type && request.size > minBytes)
  .sort((x, y) => y.size - x.size)
  .slice(0, MAX_BIG_RESOURCES);

/** Imágenes pesadas, con el motivo (tamaño mostrado, formato) y el ahorro que da Lighthouse para cada una. */
export function findBigImages(requests: Request[], audits: Audits): Findings['bigImages'] {
  const hints = new Map(itemsOf(audits['image-delivery-insight']).map((item) => [item.url, item]));
  return largestOfType(requests, 'Image', THRESHOLDS.imageBytes).map(({ url, size, mime }) => {
    const insight = hints.get(url);
    const hint = insight ? subItemsOf(insight).map((sub) => sub.reason).filter(Boolean).join(' ') : '';
    const wasted = toNumber(insight?.wastedBytes);
    return { url, size, mime, ...(hint ? { hint: truncate(hint, MAX_HINT_CHARS) } : {}), ...(wasted ? { wasted } : {}) };
  });
}

/** Scripts pesados, con los bytes que no se usan al cargar. */
export function findBigScripts(requests: Request[], audits: Audits): Findings['bigScripts'] {
  const unusedByUrl = new Map(itemsOf(audits['unused-javascript']).map((item) => [item.url, toNumber(item.wastedBytes)]));
  return largestOfType(requests, 'Script', THRESHOLDS.scriptBytes).map(({ url, size }) => {
    const unused = unusedByUrl.get(url);
    return unused ? { url, size, unused } : { url, size };
  });
}

/** Ahorros estimados en bytes (solo los que Lighthouse reporta en esta versión). */
function collectSavings(audits: Audits): Findings['savings'] {
  const savings: Findings['savings'] = {};
  const unusedJs = audits['unused-javascript']?.details?.overallSavingsBytes;
  const unminifiedJs = audits['unminified-javascript']?.details?.overallSavingsBytes;
  if (unusedJs != null) savings.unusedJs = unusedJs;
  if (unminifiedJs != null) savings.unminifiedJs = unminifiedJs;
  // Lighthouse 13 unificó tamaño y formato de imágenes en un solo insight.
  const imagesByUrl = new Map(itemsOf(audits['image-delivery-insight']).map((item) => [item.url, item]));
  if (imagesByUrl.size) savings.oversizedImages = [...imagesByUrl.values()].reduce((sum, item) => sum + toNumber(item.wastedBytes), 0);
  return savings;
}

const comparablePath = (url: URL) => url.origin + url.pathname.replace(/\/$/, '');

export function collectWarnings(lhr: Lhr, requests: Request[], requestedUrl?: string): string[] {
  const warnings = [...(lhr.runWarnings ?? [])];
  const mainDocument = requests.find((request) => request.type === 'Document');
  if (mainDocument?.status != null && mainDocument.status >= 400) {
    warnings.push(`Main document returned HTTP ${mainDocument.status}. The site may be blocking automated tests (anti-bot, geo-block).`);
  }
  if (requestedUrl && lhr.finalDisplayedUrl) {
    try {
      if (comparablePath(new URL(requestedUrl)) !== comparablePath(new URL(lhr.finalDisplayedUrl))) {
        warnings.push(`The page redirected to ${lhr.finalDisplayedUrl}. Results describe that page (e.g. an age gate or login redirect).`);
      }
    } catch { /* URL inválida: no se puede comparar */ }
  }
  return warnings;
}

/**
 * Convierte el informe (LHR) de Lighthouse en el resultado que usa la app.
 * Es una función pura: se puede probar sin Chrome.
 */
export function extract(lhr: Lhr, requestedUrl?: string): TestResult {
  if (lhr.runtimeError) {
    throw new Error(`Lighthouse error: ${lhr.runtimeError.message || lhr.runtimeError.code}`);
  }
  const score = lhr.categories?.performance?.score;
  if (score == null) {
    throw new Error('Lighthouse could not compute a performance score. The page may have failed to load or blocked the test (anti-bot, geo-block, age gate).');
  }
  const audits = lhr.audits ?? {};
  const requests = normalizeRequests(audits);

  return {
    score: Math.round(score * 100),
    lcp: audits['largest-contentful-paint']?.numericValue ?? null,
    fcp: audits['first-contentful-paint']?.numericValue ?? null,
    tbt: audits['total-blocking-time']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    pageSize: audits['total-byte-weight']?.numericValue ?? requests.reduce((sum, request) => sum + request.transfer, 0),
    requestCount: requests.length,
    findings: {
      slowApis: findSlowApis(requests),
      bigImages: findBigImages(requests, audits),
      bigScripts: findBigScripts(requests, audits),
      savings: collectSavings(audits),
      diagnosis: diagnose(audits),
    },
    warnings: collectWarnings(lhr, requests, requestedUrl),
  };
}

/** Elige la corrida con la mediana del score (evita mezclar métricas de corridas distintas). */
export function pickMedian<T extends { score: number }>(results: T[]): T {
  const sorted = [...results].sort((x, y) => x.score - y.score);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}
