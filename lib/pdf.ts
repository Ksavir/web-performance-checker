import PDFDocument from 'pdfkit';
import { LCP_PHASES, METRICS, OPPORTUNITIES, PAGE_TYPES, getDeviceLabel, getNetworkLabel, rate, resolveNetwork } from './config.ts';
import { formatBytes, formatDate, formatMs, formatScore, formatValue, shortUrl } from './format.ts';
import { COLORS } from './tokens.ts';
import type { Comparison, Delta, Diagnosis, MetricKey, Network, TestRow } from './types.ts';

type ReportTest = TestRow & { comparison: Comparison | null };
type Doc = InstanceType<typeof PDFDocument>;

const MARGIN = 48;
const TEXT_WIDTH = 500;
const ROW_HEIGHT = 14;
const SECTION_MIN_SPACE = 50;
const RATING_COLORS = { good: COLORS.good, ok: COLORS.ok, poor: COLORS.poor, none: COLORS.ink };
const URL_SHORT = 62;
const URL_LONG = 85;

function ensureSpace(doc: Doc, height: number) {
  if (doc.y + height > doc.page.height - MARGIN) doc.addPage();
}

interface TableParams {
  headers: string[];
  rows: unknown[][];
  widths: number[];
}

function drawTable(doc: Doc, { headers, rows, widths }: TableParams) {
  const tableWidth = widths.reduce((total, width) => total + width, 0);
  const drawRow = (cells: unknown[], { bold = false, color = COLORS.ink }: { bold?: boolean; color?: string } = {}) => {
    ensureSpace(doc, ROW_HEIGHT + 4);
    const y = doc.y;
    let x = MARGIN;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(color);
    cells.forEach((cell, i) => {
      doc.text(String(cell), x, y, { width: widths[i] - 6, lineBreak: false });
      x += widths[i];
    });
    doc.y = y + ROW_HEIGHT;
    doc.moveTo(MARGIN, doc.y - 2).lineTo(MARGIN + tableWidth, doc.y - 2).strokeColor(COLORS.line).lineWidth(0.5).stroke();
  };
  drawRow(headers, { bold: true, color: COLORS.muted });
  if (!rows.length) drawRow(['None found'], { color: COLORS.muted });
  rows.forEach((row) => drawRow(row));
  doc.x = MARGIN;
  doc.moveDown(0.6);
}

function drawSection(doc: Doc, title: string) {
  ensureSpace(doc, SECTION_MIN_SPACE);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.accent).text(title, MARGIN, doc.y);
  doc.moveDown(0.3);
}

function drawNote(doc: Doc, text: string) {
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text(text, MARGIN, doc.y, { width: TEXT_WIDTH });
  doc.moveDown(0.6);
}

function formatDelta(delta: Delta | undefined, key: MetricKey): string {
  if (!delta) return '';
  if (delta.status === 'same') return 'no change';
  const metric = METRICS.find((m) => m.key === key);
  const sign = delta.diff > 0 ? '+' : delta.diff < 0 ? '-' : '';
  const amount = Math.abs(delta.diff);
  const value = key === 'score' || !metric ? formatScore(amount) : formatValue(metric.fmt, amount);
  return `${sign}${value} (${delta.status})`;
}

const formatPdfDate = (iso: string) => formatDate(iso, { format: 'numeric' });

function drawTestHeader(doc: Doc, test: ReportTest) {
  const { comparison } = test;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.accent).text(getDeviceLabel(test.device));
  doc.moveDown(0.2).font('Helvetica-Bold').fontSize(12).fillColor(RATING_COLORS[rate('score', test.score)])
    .text(`Performance score: ${test.score} / 100`);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`Network: ${getNetworkLabel(resolveNetwork(test))}`);
  const intro = comparison
    ? `Compared with previous test on ${formatPdfDate(comparison.previousDate)} (score ${comparison.deltas.score?.previous}): ${formatDelta(comparison.deltas.score, 'score')}`
    : 'No previous test to compare with.';
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(intro);
  doc.moveDown(0.6);

  drawTable(doc, {
    headers: ['Metric', 'Value', 'Previous', 'Change'],
    rows: METRICS.map((metric) => {
      const delta = comparison?.deltas[metric.key];
      return [metric.label, formatValue(metric.fmt, test[metric.key]), delta ? formatValue(metric.fmt, delta.previous) : '-', delta ? formatDelta(delta, metric.key) : '-'];
    }),
    widths: [190, 90, 90, 130],
  });

  if (test.warnings.length) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.poor).text('Warnings');
    test.warnings.forEach((warning) => doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink).text(`- ${warning}`, { width: TEXT_WIDTH }));
    doc.moveDown(0.6);
  }
}

function drawDiagnosis(doc: Doc, { diagnosis, network }: { diagnosis: Diagnosis; network: Network }) {
  const { lcp, opportunities, longTasks, mainThread } = diagnosis;
  if (lcp?.phases.length) {
    const total = lcp.phases.reduce((sum, phase) => sum + phase.duration, 0);
    const dominant = lcp.phases.reduce((max, phase) => (phase.duration > max.duration ? phase : max));
    drawSection(doc, 'What delays the Largest Contentful Paint');
    drawTable(doc, {
      headers: ['Phase', 'Duration', 'Share'],
      rows: lcp.phases.map((phase) => [phase.label, formatMs(phase.duration), `${Math.round((phase.duration / Math.max(total, 1)) * 100)}%`]),
      widths: [250, 90, 90],
    });
    if (network !== 'none') {
      drawNote(doc, `Measured on the real, unthrottled load (${formatMs(total)}); the LCP metric above is simulated on a throttled connection, so compare shares, not times.`);
    }
    if (LCP_PHASES[dominant.id]) drawNote(doc, `Biggest share: ${dominant.label}. ${LCP_PHASES[dominant.id].tip}`);
    if (lcp.element?.selector) drawNote(doc, `LCP element: ${lcp.element.label ? `${lcp.element.label} - ` : ''}${lcp.element.selector}`);
  }
  if (opportunities.length) {
    drawSection(doc, 'Top opportunities');
    drawTable(doc, {
      headers: ['Opportunity', 'Time saved', 'Bytes saved'],
      rows: opportunities.map((o) => [o.title, o.savingsMs ? `${formatMs(o.savingsMs)} ${o.metric}` : '-', o.savingsBytes ? formatBytes(o.savingsBytes) : '-']),
      widths: [280, 110, 110],
    });
    opportunities.slice(0, 3).forEach((o) => drawNote(doc, `${o.title}: ${OPPORTUNITIES[o.id]?.tip ?? ''}`));
  }
  if (longTasks.count && longTasks.longest) {
    drawSection(doc, 'Main-thread work');
    drawNote(doc, `${longTasks.count} long tasks (${formatMs(longTasks.totalMs)} in total). Longest: ${formatMs(longTasks.longest.duration)} from ${shortUrl(longTasks.longest.url, { maxLength: 70 })}.`);
    drawTable(doc, { headers: ['Script', 'CPU time'], rows: mainThread.map((script) => [shortUrl(script.url, { maxLength: URL_LONG }), formatMs(script.total)]), widths: [400, 100] });
  }
}

function drawFindings(doc: Doc, test: ReportTest) {
  const { slowApis, bigImages, bigScripts, savings, diagnosis } = test.findings;
  drawSection(doc, 'Five slowest API requests');
  drawTable(doc, {
    headers: ['Request', 'Duration', 'Status', 'Size'],
    rows: slowApis.map((request) => [shortUrl(request.url, { maxLength: URL_SHORT }), `${Math.round(request.duration)} ms`, request.status ?? '-', formatBytes(request.size)]),
    widths: [300, 70, 50, 80],
  });

  drawSection(doc, 'Oversized images');
  drawTable(doc, { headers: ['Image', 'Size'], rows: bigImages.map((image) => [shortUrl(image.url, { maxLength: URL_LONG }), formatBytes(image.size)]), widths: [400, 100] });

  drawSection(doc, 'Oversized JavaScript files');
  drawTable(doc, { headers: ['Script', 'Size'], rows: bigScripts.map((script) => [shortUrl(script.url, { maxLength: URL_LONG }), formatBytes(script.size)]), widths: [400, 100] });

  // Pruebas antiguas sin diagnóstico: se mantiene la tabla de ahorros original.
  const legacyRows = Object.entries({
    'Unused JavaScript': savings.unusedJs,
    'Unminified JavaScript': savings.unminifiedJs,
    'Oversized images': savings.oversizedImages,
    'Modern image formats': savings.modernImageFormats,
  }).filter(([, bytes]) => bytes != null);
  if (!diagnosis && legacyRows.length) {
    drawSection(doc, 'Estimated savings reported by Lighthouse');
    drawTable(doc, { headers: ['Opportunity', 'Potential savings'], rows: legacyRows.map(([label, bytes]) => [label, formatBytes(bytes)]), widths: [300, 150] });
  }
}

/** Genera el PDF de un lote (mobile + desktop) y devuelve un Buffer. */
export function buildPdf(tests: ReportTest[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: 'Casino performance report' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const [first] = tests;
    const pageLabel = PAGE_TYPES.find((p) => p.id === first.pageType)?.label ?? first.pageType;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.accent).text('Casino performance report');
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(COLORS.ink)
      .text(`URL: ${first.url}`)
      .text(`Page type: ${pageLabel}`)
      .text(`Date: ${formatPdfDate(first.createdAt)}`)
      .text(`Tool: Lighthouse (performance category). Runs per device: ${first.runs} (median score run reported).`);
    doc.moveDown(0.8);

    tests.forEach((test, index) => {
      if (index > 0) doc.addPage();
      drawTestHeader(doc, test);
      if (test.findings.diagnosis) drawDiagnosis(doc, { diagnosis: test.findings.diagnosis, network: resolveNetwork(test) });
      drawFindings(doc, test);
    });

    doc.end();
  });
}
