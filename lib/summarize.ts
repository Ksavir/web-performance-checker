import { LCP_PHASES, METRICS, OPPORTUNITIES, RATINGS, THRESHOLDS, formatBytes, formatValue, rate } from './config.ts';
import type { Comparison, MetricKey, Priority, Rating, Summary, SummaryAction, SummaryVital, TestResult } from './types.ts';

type Input = TestResult & { runs?: number; comparison?: Comparison | null };
type Vital = SummaryVital['key'];
type Action = SummaryAction & { lead?: boolean };

const VITALS: { key: Vital; label: string; problem: string }[] = [
  { key: 'lcp', label: 'LCP', problem: 'The main content appears late' },
  { key: 'fcp', label: 'FCP', problem: 'Nothing shows on screen for too long' },
  { key: 'tbt', label: 'TBT', problem: 'The page stays unresponsive while it loads' },
  { key: 'cls', label: 'CLS', problem: 'Content jumps around while loading' },
];
const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const RATING_WORD: Record<Rating, string> = { good: 'good', ok: 'needs improvement', poor: 'poor', none: 'unknown' };
const SHOWN_FILES = 3;
// Estas auditorías se funden con los hallazgos de imágenes y scripts en vez de repetirse.
const MERGED = ['image-delivery-insight', 'unused-javascript'];

const ms = (v: number) => formatValue('ms', v);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const isHttp = (u: string) => /^https?:/i.test(u);
const shortUrl = (u: string, n = 70) => {
  let s = u;
  try { const x = new URL(u); s = x.host + x.pathname + x.search; } catch { /* no es una URL */ }
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const where = (url: string, detail?: string) => ({ text: shortUrl(url), ...(isHttp(url) ? { href: url } : {}), ...(detail ? { detail } : {}) });

function fmtTarget(key: Vital) {
  const v = RATINGS[key].good;
  if (key === 'cls') return String(v);
  return v >= 1000 ? `${v / 1000} s` : `${v} ms`;
}

/** Prioridad según lo que Lighthouse estima ahorrar. */
function priorityFor({ ms: saved = 0, bytes = 0 }: { ms?: number; bytes?: number }): Priority {
  if (saved >= 300 || bytes >= 500 * 1024) return 'high';
  if (saved >= 100 || bytes >= 100 * 1024) return 'medium';
  return 'low';
}
const atLeast = (p: Priority, floor: Priority): Priority => (RANK[p] <= RANK[floor] ? p : floor);
const fromRating = (r: Rating): Priority | null => (r === 'poor' ? 'high' : r === 'ok' ? 'medium' : null);

/**
 * Resume una prueba: veredicto, qué arreglar (priorizado, con evidencia y consejo) y qué va bien.
 * Es una función pura sobre los datos ya guardados; funciona también con pruebas anteriores al diagnóstico.
 */
export function summarize(t: Input): Summary {
  const f = t.findings;
  const d = f.diagnosis;
  const cmp = t.comparison ?? null;
  const rating = rate('score', t.score);
  const sv = d ? {} : f.savings; // sin diagnóstico, los ahorros salen de la tabla antigua
  const opp = (id: string) => d?.opportunities.find((o) => o.id === id);

  const vitals: SummaryVital[] = VITALS.map(({ key, label }) => ({
    key, label,
    value: formatValue(METRICS.find((m) => m.key === key)!.fmt, t[key]),
    target: `≤ ${fmtTarget(key)}`,
    rating: rate(key, t[key]),
  }));
  const notGood = vitals.filter((v) => v.rating === 'ok' || v.rating === 'poor');

  const actions: Action[] = [];

  // — Métricas fuera de objetivo —
  const lcpRating = rate('lcp', t.lcp);
  if (fromRating(lcpRating)) {
    const phases = d?.lcp?.phases ?? [];
    const total = sum(phases.map((p) => p.duration));
    const top = phases.reduce<(typeof phases)[number] | null>((m, p) => (p.duration > (m?.duration ?? 0) ? p : m), null);
    let why = `LCP is ${ms(t.lcp!)} (target ≤ ${fmtTarget('lcp')}).`;
    let tip = 'Make the largest element on screen available sooner: a smaller, optimized file that is discoverable early in the HTML and not held back by scripts.';
    if (top && total > 0 && LCP_PHASES[top.id]) {
      why += ` Biggest share of the delay: ${LCP_PHASES[top.id].label} (${Math.round((top.duration / total) * 100)}%).`;
      tip = LCP_PHASES[top.id].tip;
    }
    const el = d?.lcp?.element;
    actions.push({
      id: 'lcp', lead: true, title: 'Speed up the main content (LCP)', why, tip, priority: fromRating(lcpRating)!,
      where: el?.selector ? [{ text: el.selector, detail: 'LCP element' }] : [],
    });
  }

  const rb = d?.renderBlocking ?? [];
  const fcpRating = rate('fcp', t.fcp);
  if (rb.length || fromRating(fcpRating)) {
    const why = [];
    if (fromRating(fcpRating)) why.push(`FCP is ${ms(t.fcp!)} (target ≤ ${fmtTarget('fcp')}).`);
    if (rb.length) why.push(`${plural(rb.length, 'request')} ${rb.length === 1 ? 'blocks' : 'block'} the first paint (about ${ms(sum(rb.map((r) => r.ms)))}).`);
    actions.push({
      id: 'render-blocking', lead: true, title: 'Unblock the first paint (FCP)', why: why.join(' '),
      tip: rb.length
        ? 'Defer or async non-critical scripts, load non-critical CSS later and inline only the critical CSS.'
        : 'Cut render-blocking CSS and JS and make the server answer faster (CDN or edge caching) so the first paint is not delayed.',
      priority: fromRating(fcpRating) ?? 'low',
      where: rb.slice(0, SHOWN_FILES).map((r) => where(r.url, `${formatBytes(r.size)} · blocks ${ms(r.ms)}`)),
    });
  }

  const tbtRating = rate('tbt', t.tbt);
  if (fromRating(tbtRating)) {
    const lt = d?.longTasks;
    let why = `TBT is ${ms(t.tbt!)} (target ≤ ${fmtTarget('tbt')}).`;
    if (lt?.count && lt.longest) why += ` ${plural(lt.count, 'long task')} blocked the main thread for ${ms(lt.totalMs)} in total; the longest (${ms(lt.longest.duration)}) came from ${shortUrl(lt.longest.url, 50)}.`;
    actions.push({
      id: 'tbt', lead: true, title: 'Free the main thread (TBT)', why,
      tip: 'Defer or split heavy scripts (third-party tags, hydration, consent banners) and break long tasks (over 50 ms) into smaller chunks so taps and clicks respond right away.',
      priority: fromRating(tbtRating)!,
      where: (d?.mainThread ?? []).slice(0, SHOWN_FILES).map((r) => where(r.url, `${ms(r.total)} of CPU`)),
    });
  }

  const clsRating = rate('cls', t.cls);
  if (fromRating(clsRating)) {
    actions.push({
      id: 'cls', lead: true, title: 'Stop layout shifts (CLS)', why: `CLS is ${formatValue('cls', t.cls)} (target ≤ ${fmtTarget('cls')}).`,
      tip: 'Set width and height (or aspect-ratio) on images, videos and embeds, reserve space for banners and late-loading widgets, and avoid inserting content above what is already visible.',
      priority: fromRating(clsRating)!, where: [],
    });
  }

  // — Imágenes —
  const imgOpp = opp('image-delivery-insight');
  const imgBytes = imgOpp?.savingsBytes ?? (sv.oversizedImages || undefined);
  if (f.bigImages.length || imgOpp || imgBytes) {
    const total = sum(f.bigImages.map((i) => i.size));
    const why = [];
    if (f.bigImages.length) why.push(`${plural(f.bigImages.length, 'image')} above ${formatBytes(THRESHOLDS.imageBytes)} (${formatBytes(total)} in total).`);
    if (imgBytes) why.push(`Lighthouse estimates ${formatBytes(Math.round(imgBytes))} can be saved by resizing and re-encoding images.`);
    actions.push({
      id: 'images', title: 'Slim down heavy images', why: why.join(' '), tip: OPPORTUNITIES['image-delivery-insight'].tip,
      priority: atLeast(priorityFor({ ms: imgOpp?.savingsMs, bytes: imgBytes }), total >= 1024 * 1024 ? 'medium' : 'low'),
      savingsMs: imgOpp?.savingsMs, metric: imgOpp?.metric, savingsBytes: imgBytes,
      where: f.bigImages.length
        ? f.bigImages.slice(0, SHOWN_FILES).map((i) => where(i.url, `${formatBytes(i.size)}${i.wasted ? ` · save ~${formatBytes(i.wasted)}` : ''}`))
        : (imgOpp?.items ?? []).slice(0, SHOWN_FILES).map((i) => where(i.url, i.wasted ? `save ~${formatBytes(Math.round(i.wasted))}` : i.detail)),
    });
  }

  // — JavaScript pesado o sin usar —
  const jsOpp = opp('unused-javascript');
  const unusedBytes = jsOpp?.savingsBytes ?? (sv.unusedJs || undefined);
  if (f.bigScripts.length || jsOpp || unusedBytes) {
    const total = sum(f.bigScripts.map((s) => s.size));
    const why = [];
    if (f.bigScripts.length) why.push(`${plural(f.bigScripts.length, 'script')} above ${formatBytes(THRESHOLDS.scriptBytes)} (${formatBytes(total)} in total).`);
    if (unusedBytes) why.push(`About ${formatBytes(Math.round(unusedBytes))} of JavaScript is not used while the page loads.`);
    actions.push({
      id: 'scripts', title: 'Ship less JavaScript', why: why.join(' '), tip: OPPORTUNITIES['unused-javascript'].tip,
      priority: atLeast(priorityFor({ ms: jsOpp?.savingsMs, bytes: unusedBytes }), total >= 1024 * 1024 ? 'medium' : 'low'),
      savingsMs: jsOpp?.savingsMs, metric: jsOpp?.metric, savingsBytes: unusedBytes,
      where: f.bigScripts.length
        ? f.bigScripts.slice(0, SHOWN_FILES).map((s) => where(s.url, `${formatBytes(s.size)}${s.unused ? ` · ${formatBytes(s.unused)} unused` : ''}`))
        : (jsOpp?.items ?? []).slice(0, SHOWN_FILES).map((i) => where(i.url, i.detail)),
    });
  }

  // — Resto de oportunidades de Lighthouse —
  for (const o of d?.opportunities ?? []) {
    if (MERGED.includes(o.id)) continue;
    const gain = [];
    if (o.savingsMs) gain.push(`up to ${ms(o.savingsMs)} off ${o.metric}`);
    if (o.savingsBytes) gain.push(`${formatBytes(Math.round(o.savingsBytes))} less to download`);
    actions.push({
      id: o.id, title: o.title, tip: OPPORTUNITIES[o.id]?.tip ?? '',
      why: gain.length ? `Lighthouse estimates ${gain.join(' and ')}.` : 'Lighthouse flagged this audit.',
      priority: priorityFor({ ms: o.savingsMs, bytes: o.savingsBytes }),
      savingsMs: o.savingsMs, metric: o.metric, savingsBytes: o.savingsBytes,
      where: o.items.slice(0, SHOWN_FILES).map((i) => where(i.url, i.detail ?? (i.wasted ? formatBytes(Math.round(i.wasted)) : i.wastedMs ? ms(i.wastedMs) : undefined))),
    });
  }
  if (!d && sv.unminifiedJs) {
    actions.push({
      id: 'unminified-javascript', title: OPPORTUNITIES['unminified-javascript'].title, tip: OPPORTUNITIES['unminified-javascript'].tip,
      why: `Lighthouse estimates ${formatBytes(Math.round(sv.unminifiedJs))} less to download.`,
      priority: priorityFor({ bytes: sv.unminifiedJs }), savingsBytes: sv.unminifiedJs, where: [],
    });
  }

  // — APIs y peso total —
  const slow = f.slowApis.filter((r) => r.duration >= THRESHOLDS.slowApiMs);
  if (slow.length) {
    actions.push({
      id: 'api', title: 'Speed up slow API calls',
      why: `${plural(slow.length, 'API request')} ${slow.length === 1 ? 'takes' : 'take'} longer than ${THRESHOLDS.slowApiMs / 1000} s; the slowest is ${shortUrl(slow[0].url, 50)} (${ms(slow[0].duration)}).`,
      tip: 'Cache responses (CDN or server side), run independent calls in parallel instead of one after another, and defer calls the first screen does not need.',
      priority: slow[0].duration >= 3000 ? 'high' : 'medium',
      where: slow.slice(0, SHOWN_FILES).map((r) => where(r.url, `${ms(r.duration)}${r.status ? ` · HTTP ${r.status}` : ''}`)),
    });
  }
  if (t.pageSize >= THRESHOLDS.pageBytes) {
    actions.push({
      id: 'page-weight', title: 'Lighten the page',
      why: `The page transfers ${formatBytes(t.pageSize)} across ${plural(t.requestCount, 'request')}.`,
      tip: 'Lazy-load images, video and widgets below the fold, serve compressed formats (Brotli, AVIF or WebP) and drop third-party tags you no longer use.',
      priority: t.pageSize >= THRESHOLDS.pageBytes * 2 ? 'high' : 'medium', where: [],
    });
  }

  actions.sort((a, b) => RANK[a.priority] - RANK[b.priority] || Number(!!b.lead) - Number(!!a.lead)
    || (b.savingsMs ?? 0) - (a.savingsMs ?? 0) || (b.savingsBytes ?? 0) - (a.savingsBytes ?? 0));

  // — Veredicto —
  const worst = [...notGood].sort((x, y) => Number(y.rating === 'poor') - Number(x.rating === 'poor')
    || (t[y.key]! / RATINGS[y.key].poor) - (t[x.key]! / RATINGS[x.key].poor))[0];
  const scoreDelta = cmp?.deltas.score;
  const scoreText = `Score ${t.score}/100${scoreDelta && scoreDelta.status !== 'same'
    ? `, ${scoreDelta.diff > 0 ? 'up' : 'down'} ${Math.round(Math.abs(scoreDelta.diff))} from the previous test`
    : ''}.`;
  let headline: string;
  let detail: string;
  if (worst) {
    headline = VITALS.find((v) => v.key === worst.key)!.problem;
    const others = notGood.length - 1;
    detail = `${worst.label} is ${worst.value} (${RATING_WORD[worst.rating]}; target ${worst.target}).${others ? ` ${plural(others, 'other metric')} also ${others === 1 ? 'needs' : 'need'} attention.` : ''} ${scoreText}`;
  } else if (rating === 'good') {
    headline = 'Fast page: no major problems found';
    detail = `All Core Web Vitals are within target. ${scoreText}`;
  } else {
    headline = 'Core Web Vitals are fine, but the score can still improve';
    detail = `${scoreText} The suggestions below are the remaining gains.`;
  }

  // — Qué va bien —
  const working: string[] = [];
  for (const v of vitals) if (v.rating === 'good') working.push(`${v.label} is ${v.value}, within the ${fmtTarget(v.key)} target.`);
  if (d && !d.renderBlocking.length) working.push('No render-blocking requests.');
  if (d && !d.longTasks.count) working.push('No long main-thread tasks.');
  if (!f.bigImages.length) working.push(`No images above ${formatBytes(THRESHOLDS.imageBytes)}.`);
  if (!f.bigScripts.length) working.push(`No scripts above ${formatBytes(THRESHOLDS.scriptBytes)}.`);
  if (f.slowApis.length && !slow.length) working.push(`API calls are quick (slowest ${ms(f.slowApis[0].duration)}).`);

  // — Cambios frente a la prueba anterior —
  let changes: Summary['changes'] = null;
  if (cmp) {
    const worse: string[] = [];
    const better: string[] = [];
    const LABELS: Record<MetricKey, string> = { score: 'Score', lcp: 'LCP', fcp: 'FCP', tbt: 'TBT', cls: 'CLS', pageSize: 'Page size', requestCount: 'Requests' };
    for (const key of Object.keys(LABELS) as MetricKey[]) {
      const dl = cmp.deltas[key];
      if (!dl || dl.status === 'same') continue;
      const fmt = key === 'score' ? (v: number) => String(Math.round(v)) : (v: number) => formatValue(METRICS.find((m) => m.key === key)!.fmt, v);
      (dl.status === 'worse' ? worse : better).push(`${LABELS[key]}: ${fmt(dl.previous)} → ${fmt(dl.current)} (${dl.diff > 0 ? '+' : '−'}${fmt(Math.abs(dl.diff))})`);
    }
    changes = { since: cmp.previousDate, worse, better, singleRun: (t.runs ?? 1) === 1 };
  }

  return {
    rating, headline, detail, vitals, caveats: t.warnings, changes, working,
    actions: actions.map(({ lead, ...a }) => a),
  };
}
