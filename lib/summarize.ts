import { LCP_PHASES, METRICS, OPPORTUNITIES, PRIORITY_THRESHOLDS, RATINGS, THRESHOLDS, rate } from './config.ts';
import { formatBytes, formatMs, formatScore, formatValue, shortUrl } from './format.ts';
import type { Comparison, MetricKey, Priority, Rating, Summary, SummaryAction, SummaryVital, TestResult } from './types.ts';

type SummaryInput = TestResult & { runs?: number; comparison?: Comparison | null };
type VitalKey = SummaryVital['key'];
/** `lead` marca las acciones de métricas fuera de objetivo, que van antes que las oportunidades de su misma prioridad. */
type Action = SummaryAction & { lead?: boolean };

const VITALS: { key: VitalKey; label: string; problem: string }[] = [
  { key: 'lcp', label: 'LCP', problem: 'The main content appears late' },
  { key: 'fcp', label: 'FCP', problem: 'Nothing shows on screen for too long' },
  { key: 'tbt', label: 'TBT', problem: 'The page stays unresponsive while it loads' },
  { key: 'cls', label: 'CLS', problem: 'Content jumps around while loading' },
];
const CHANGE_LABELS: Record<MetricKey, string> = { score: 'Score', lcp: 'LCP', fcp: 'FCP', tbt: 'TBT', cls: 'CLS', pageSize: 'Page size', requestCount: 'Requests' };
const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const RATING_WORD: Record<Rating, string> = { good: 'good', ok: 'needs improvement', poor: 'poor', none: 'unknown' };
const SHOWN_FILES = 3;
const MAX_URL_IN_TEXT = 50;
// Estas auditorías se funden con los hallazgos de imágenes y scripts en vez de repetirse.
const MERGED_OPPORTUNITIES = ['image-delivery-insight', 'unused-javascript'];

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const isHttp = (url: string) => /^https?:/i.test(url);
const metricFormat = (key: MetricKey) => METRICS.find((metric) => metric.key === key)?.fmt ?? 'int';
const formatMetric = (key: MetricKey, value: number) => (key === 'score' ? formatScore(value) : formatValue(metricFormat(key), value));
const findOpportunity = (test: SummaryInput, id: string) => test.findings.diagnosis?.opportunities.find((opportunity) => opportunity.id === id);
/** Ahorros de la tabla antigua: solo cuentan en pruebas guardadas antes de que existiera el diagnóstico. */
const legacySavings = (test: SummaryInput) => (test.findings.diagnosis ? {} : test.findings.savings);

const where = (url: string, detail?: string) => ({
  text: shortUrl(url, { maxLength: 70 }),
  ...(isHttp(url) ? { href: url } : {}),
  ...(detail ? { detail } : {}),
});

function formatTarget(key: VitalKey) {
  const target = RATINGS[key].good;
  if (key === 'cls') return String(target);
  return target >= 1000 ? `${target / 1000} s` : `${target} ms`;
}

/** Prioridad según lo que Lighthouse estima ahorrar. */
function priorityFromSavings({ ms = 0, bytes = 0 }: { ms?: number; bytes?: number }): Priority {
  if (ms >= PRIORITY_THRESHOLDS.highMs || bytes >= PRIORITY_THRESHOLDS.highBytes) return 'high';
  if (ms >= PRIORITY_THRESHOLDS.mediumMs || bytes >= PRIORITY_THRESHOLDS.mediumBytes) return 'medium';
  return 'low';
}
const atLeast = (priority: Priority, floor: Priority): Priority => (RANK[priority] <= RANK[floor] ? priority : floor);
const priorityFromRating = (rating: Rating): Priority | null => (rating === 'poor' ? 'high' : rating === 'ok' ? 'medium' : null);

const byPriority = (a: Action, b: Action) =>
  RANK[a.priority] - RANK[b.priority]
  || Number(!!b.lead) - Number(!!a.lead)
  || (b.savingsMs ?? 0) - (a.savingsMs ?? 0)
  || (b.savingsBytes ?? 0) - (a.savingsBytes ?? 0);

function buildVitals(test: SummaryInput): SummaryVital[] {
  return VITALS.map(({ key, label }) => ({
    key,
    label,
    value: formatValue(metricFormat(key), test[key]),
    target: `≤ ${formatTarget(key)}`,
    rating: rate(key, test[key]),
  }));
}

// — Métricas fuera de objetivo —

function buildLcpAction(test: SummaryInput): Action[] {
  const priority = priorityFromRating(rate('lcp', test.lcp));
  if (!priority || test.lcp == null) return [];
  const lcpDiagnosis = test.findings.diagnosis?.lcp;
  const phases = lcpDiagnosis?.phases ?? [];
  const total = sum(phases.map((phase) => phase.duration));
  const dominant = phases.reduce<(typeof phases)[number] | null>((max, phase) => (phase.duration > (max?.duration ?? 0) ? phase : max), null);
  const dominantTip = dominant ? LCP_PHASES[dominant.id] : undefined;

  let why = `LCP is ${formatMs(test.lcp)} (target ≤ ${formatTarget('lcp')}).`;
  let tip = 'Make the largest element on screen available sooner: a smaller, optimized file that is discoverable early in the HTML and not held back by scripts.';
  if (dominant && dominantTip && total > 0) {
    why += ` Biggest share of the delay: ${dominantTip.label} (${Math.round((dominant.duration / total) * 100)}%).`;
    tip = dominantTip.tip;
  }
  const selector = lcpDiagnosis?.element?.selector;
  return [{
    id: 'lcp', lead: true, title: 'Speed up the main content (LCP)', why, tip, priority,
    where: selector ? [{ text: selector, detail: 'LCP element' }] : [],
  }];
}

function buildRenderBlockingAction(test: SummaryInput): Action[] {
  const renderBlocking = test.findings.diagnosis?.renderBlocking ?? [];
  const fcpPriority = priorityFromRating(rate('fcp', test.fcp));
  if (!renderBlocking.length && !fcpPriority) return [];
  const why = [];
  if (fcpPriority && test.fcp != null) why.push(`FCP is ${formatMs(test.fcp)} (target ≤ ${formatTarget('fcp')}).`);
  if (renderBlocking.length) {
    const verb = renderBlocking.length === 1 ? 'blocks' : 'block';
    why.push(`${plural(renderBlocking.length, 'request')} ${verb} the first paint (about ${formatMs(sum(renderBlocking.map((request) => request.ms)))}).`);
  }
  return [{
    id: 'render-blocking', lead: true, title: 'Unblock the first paint (FCP)', why: why.join(' '),
    tip: renderBlocking.length
      ? 'Defer or async non-critical scripts, load non-critical CSS later and inline only the critical CSS.'
      : 'Cut render-blocking CSS and JS and make the server answer faster (CDN or edge caching) so the first paint is not delayed.',
    priority: fcpPriority ?? 'low',
    where: renderBlocking.slice(0, SHOWN_FILES).map((request) => where(request.url, `${formatBytes(request.size)} · blocks ${formatMs(request.ms)}`)),
  }];
}

function buildTbtAction(test: SummaryInput): Action[] {
  const priority = priorityFromRating(rate('tbt', test.tbt));
  if (!priority || test.tbt == null) return [];
  const longTasks = test.findings.diagnosis?.longTasks;
  let why = `TBT is ${formatMs(test.tbt)} (target ≤ ${formatTarget('tbt')}).`;
  if (longTasks?.count && longTasks.longest) {
    const source = shortUrl(longTasks.longest.url, { maxLength: MAX_URL_IN_TEXT });
    why += ` ${plural(longTasks.count, 'long task')} blocked the main thread for ${formatMs(longTasks.totalMs)} in total; the longest (${formatMs(longTasks.longest.duration)}) came from ${source}.`;
  }
  return [{
    id: 'tbt', lead: true, title: 'Free the main thread (TBT)', why,
    tip: 'Defer or split heavy scripts (third-party tags, hydration, consent banners) and break long tasks (over 50 ms) into smaller chunks so taps and clicks respond right away.',
    priority,
    where: (test.findings.diagnosis?.mainThread ?? []).slice(0, SHOWN_FILES).map((script) => where(script.url, `${formatMs(script.total)} of CPU`)),
  }];
}

function buildClsAction(test: SummaryInput): Action[] {
  const priority = priorityFromRating(rate('cls', test.cls));
  if (!priority) return [];
  return [{
    id: 'cls', lead: true, title: 'Stop layout shifts (CLS)', why: `CLS is ${formatValue('cls', test.cls)} (target ≤ ${formatTarget('cls')}).`,
    tip: 'Set width and height (or aspect-ratio) on images, videos and embeds, reserve space for banners and late-loading widgets, and avoid inserting content above what is already visible.',
    priority, where: [],
  }];
}

const buildVitalActions = (test: SummaryInput): Action[] => [
  ...buildLcpAction(test),
  ...buildRenderBlockingAction(test),
  ...buildTbtAction(test),
  ...buildClsAction(test),
];

// — Imágenes y JavaScript (fusionados con su auditoría de Lighthouse) —

function buildImageActions(test: SummaryInput): Action[] {
  const { bigImages } = test.findings;
  const insight = findOpportunity(test, 'image-delivery-insight');
  const savingsBytes = insight?.savingsBytes ?? (legacySavings(test).oversizedImages || undefined);
  if (!bigImages.length && !insight && !savingsBytes) return [];
  const total = sum(bigImages.map((image) => image.size));
  const why = [];
  if (bigImages.length) why.push(`${plural(bigImages.length, 'image')} above ${formatBytes(THRESHOLDS.imageBytes)} (${formatBytes(total)} in total).`);
  if (savingsBytes) why.push(`Lighthouse estimates ${formatBytes(savingsBytes)} can be saved by resizing and re-encoding images.`);
  const heavyFloor = total >= PRIORITY_THRESHOLDS.heavyGroupBytes ? 'medium' : 'low';
  return [{
    id: 'images', title: 'Slim down heavy images', why: why.join(' '), tip: OPPORTUNITIES['image-delivery-insight'].tip,
    priority: atLeast(priorityFromSavings({ ms: insight?.savingsMs, bytes: savingsBytes }), heavyFloor),
    savingsMs: insight?.savingsMs, metric: insight?.metric, savingsBytes,
    where: bigImages.length
      ? bigImages.slice(0, SHOWN_FILES).map((image) => where(image.url, `${formatBytes(image.size)}${image.wasted ? ` · save ~${formatBytes(image.wasted)}` : ''}`))
      : (insight?.items ?? []).slice(0, SHOWN_FILES).map((item) => where(item.url, item.wasted ? `save ~${formatBytes(item.wasted)}` : item.detail)),
  }];
}

function buildScriptActions(test: SummaryInput): Action[] {
  const { bigScripts } = test.findings;
  const insight = findOpportunity(test, 'unused-javascript');
  const unusedBytes = insight?.savingsBytes ?? (legacySavings(test).unusedJs || undefined);
  if (!bigScripts.length && !insight && !unusedBytes) return [];
  const total = sum(bigScripts.map((script) => script.size));
  const why = [];
  if (bigScripts.length) why.push(`${plural(bigScripts.length, 'script')} above ${formatBytes(THRESHOLDS.scriptBytes)} (${formatBytes(total)} in total).`);
  if (unusedBytes) why.push(`About ${formatBytes(unusedBytes)} of JavaScript is not used while the page loads.`);
  const heavyFloor = total >= PRIORITY_THRESHOLDS.heavyGroupBytes ? 'medium' : 'low';
  return [{
    id: 'scripts', title: 'Ship less JavaScript', why: why.join(' '), tip: OPPORTUNITIES['unused-javascript'].tip,
    priority: atLeast(priorityFromSavings({ ms: insight?.savingsMs, bytes: unusedBytes }), heavyFloor),
    savingsMs: insight?.savingsMs, metric: insight?.metric, savingsBytes: unusedBytes,
    where: bigScripts.length
      ? bigScripts.slice(0, SHOWN_FILES).map((script) => where(script.url, `${formatBytes(script.size)}${script.unused ? ` · ${formatBytes(script.unused)} unused` : ''}`))
      : (insight?.items ?? []).slice(0, SHOWN_FILES).map((item) => where(item.url, item.detail)),
  }];
}

// — Resto de oportunidades de Lighthouse —

function buildOpportunityActions(test: SummaryInput): Action[] {
  const opportunities = (test.findings.diagnosis?.opportunities ?? []).filter((opportunity) => !MERGED_OPPORTUNITIES.includes(opportunity.id));
  const actions: Action[] = opportunities.map((opportunity) => {
    const gain = [];
    if (opportunity.savingsMs) gain.push(`up to ${formatMs(opportunity.savingsMs)} off ${opportunity.metric}`);
    if (opportunity.savingsBytes) gain.push(`${formatBytes(opportunity.savingsBytes)} less to download`);
    return {
      id: opportunity.id, title: opportunity.title, tip: OPPORTUNITIES[opportunity.id]?.tip ?? '',
      why: gain.length ? `Lighthouse estimates ${gain.join(' and ')}.` : 'Lighthouse flagged this audit.',
      priority: priorityFromSavings({ ms: opportunity.savingsMs, bytes: opportunity.savingsBytes }),
      savingsMs: opportunity.savingsMs, metric: opportunity.metric, savingsBytes: opportunity.savingsBytes,
      where: opportunity.items.slice(0, SHOWN_FILES).map((item) => {
        const fallback = item.wasted ? formatBytes(item.wasted) : item.wastedMs ? formatMs(item.wastedMs) : undefined;
        return where(item.url, item.detail ?? fallback);
      }),
    };
  });

  const { unminifiedJs } = legacySavings(test);
  if (unminifiedJs) {
    const meta = OPPORTUNITIES['unminified-javascript'];
    actions.push({
      id: 'unminified-javascript', title: meta.title, tip: meta.tip,
      why: `Lighthouse estimates ${formatBytes(unminifiedJs)} less to download.`,
      priority: priorityFromSavings({ bytes: unminifiedJs }), savingsBytes: unminifiedJs, where: [],
    });
  }
  return actions;
}

// — APIs y peso total —

const findSlowApiCalls = (test: SummaryInput) => test.findings.slowApis.filter((request) => request.duration >= THRESHOLDS.slowApiMs);

function buildApiActions(test: SummaryInput): Action[] {
  const slow = findSlowApiCalls(test);
  if (!slow.length) return [];
  const [slowest] = slow;
  const verb = slow.length === 1 ? 'takes' : 'take';
  return [{
    id: 'api', title: 'Speed up slow API calls',
    why: `${plural(slow.length, 'API request')} ${verb} longer than ${THRESHOLDS.slowApiMs / 1000} s; the slowest is ${shortUrl(slowest.url, { maxLength: MAX_URL_IN_TEXT })} (${formatMs(slowest.duration)}).`,
    tip: 'Cache responses (CDN or server side), run independent calls in parallel instead of one after another, and defer calls the first screen does not need.',
    priority: slowest.duration >= THRESHOLDS.verySlowApiMs ? 'high' : 'medium',
    where: slow.slice(0, SHOWN_FILES).map((request) => where(request.url, `${formatMs(request.duration)}${request.status ? ` · HTTP ${request.status}` : ''}`)),
  }];
}

function buildPageWeightActions(test: SummaryInput): Action[] {
  if (test.pageSize < THRESHOLDS.pageBytes) return [];
  return [{
    id: 'page-weight', title: 'Lighten the page',
    why: `The page transfers ${formatBytes(test.pageSize)} across ${plural(test.requestCount, 'request')}.`,
    tip: 'Lazy-load images, video and widgets below the fold, serve compressed formats (Brotli, AVIF or WebP) and drop third-party tags you no longer use.',
    priority: test.pageSize >= THRESHOLDS.veryHeavyPageBytes ? 'high' : 'medium',
    where: [],
  }];
}

// — Veredicto, cambios y lo que funciona —

/** La métrica más alejada de su objetivo: primero las "poor" y, entre ellas, la de mayor valor relativo al umbral. */
function findWorstVital(test: SummaryInput, vitals: SummaryVital[]) {
  const severity = (vital: SummaryVital) => (test[vital.key] ?? 0) / RATINGS[vital.key].poor;
  return vitals
    .filter((vital) => vital.rating === 'ok' || vital.rating === 'poor')
    .sort((x, y) => Number(y.rating === 'poor') - Number(x.rating === 'poor') || severity(y) - severity(x))[0];
}

function buildVerdict(test: SummaryInput, vitals: SummaryVital[]): Pick<Summary, 'rating' | 'headline' | 'detail'> {
  const rating = rate('score', test.score);
  const scoreDelta = test.comparison?.deltas.score;
  const scoreChange = scoreDelta && scoreDelta.status !== 'same'
    ? `, ${scoreDelta.diff > 0 ? 'up' : 'down'} ${Math.round(Math.abs(scoreDelta.diff))} from the previous test`
    : '';
  const scoreText = `Score ${test.score}/100${scoreChange}.`;

  const worst = findWorstVital(test, vitals);
  if (worst) {
    const others = vitals.filter((vital) => vital.rating === 'ok' || vital.rating === 'poor').length - 1;
    const othersText = others ? ` ${plural(others, 'other metric')} also ${others === 1 ? 'needs' : 'need'} attention.` : '';
    return {
      rating,
      headline: VITALS.find((vital) => vital.key === worst.key)?.problem ?? '',
      detail: `${worst.label} is ${worst.value} (${RATING_WORD[worst.rating]}; target ${worst.target}).${othersText} ${scoreText}`,
    };
  }
  if (rating === 'good') return { rating, headline: 'Fast page: no major problems found', detail: `All Core Web Vitals are within target. ${scoreText}` };
  return { rating, headline: 'Core Web Vitals are fine, but the score can still improve', detail: `${scoreText} The suggestions below are the remaining gains.` };
}

function buildWorkingList(test: SummaryInput, vitals: SummaryVital[]): string[] {
  const { diagnosis, bigImages, bigScripts, slowApis } = test.findings;
  const working = vitals
    .filter((vital) => vital.rating === 'good')
    .map((vital) => `${vital.label} is ${vital.value}, within the ${formatTarget(vital.key)} target.`);
  if (diagnosis && !diagnosis.renderBlocking.length) working.push('No render-blocking requests.');
  if (diagnosis && !diagnosis.longTasks.count) working.push('No long main-thread tasks.');
  if (!bigImages.length) working.push(`No images above ${formatBytes(THRESHOLDS.imageBytes)}.`);
  if (!bigScripts.length) working.push(`No scripts above ${formatBytes(THRESHOLDS.scriptBytes)}.`);
  if (slowApis.length && !findSlowApiCalls(test).length) working.push(`API calls are quick (slowest ${formatMs(slowApis[0].duration)}).`);
  return working;
}

function buildChanges(test: SummaryInput): Summary['changes'] {
  const { comparison } = test;
  if (!comparison) return null;
  const worse: string[] = [];
  const better: string[] = [];
  for (const key of Object.keys(CHANGE_LABELS) as MetricKey[]) {
    const delta = comparison.deltas[key];
    if (!delta || delta.status === 'same') continue;
    const sign = delta.diff > 0 ? '+' : '−';
    const line = `${CHANGE_LABELS[key]}: ${formatMetric(key, delta.previous)} → ${formatMetric(key, delta.current)} (${sign}${formatMetric(key, Math.abs(delta.diff))})`;
    (delta.status === 'worse' ? worse : better).push(line);
  }
  return { since: comparison.previousDate, worse, better, singleRun: (test.runs ?? 1) === 1 };
}

/**
 * Resume una prueba: veredicto, qué arreglar (priorizado, con evidencia y consejo) y qué va bien.
 * Es una función pura sobre los datos ya guardados; funciona también con pruebas anteriores al diagnóstico.
 */
export function summarize(test: SummaryInput): Summary {
  const vitals = buildVitals(test);
  const actions = [
    ...buildVitalActions(test),
    ...buildImageActions(test),
    ...buildScriptActions(test),
    ...buildOpportunityActions(test),
    ...buildApiActions(test),
    ...buildPageWeightActions(test),
  ].sort(byPriority);

  return {
    ...buildVerdict(test, vitals),
    vitals,
    caveats: test.warnings,
    changes: buildChanges(test),
    actions: actions.map(({ lead, ...action }) => action),
    working: buildWorkingList(test, vitals),
  };
}
