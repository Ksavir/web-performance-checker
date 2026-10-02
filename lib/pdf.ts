import PDFDocument from 'pdfkit';
import { METRICS, PAGE_TYPES, formatValue, formatBytes, rate } from './config.ts';
import type { Comparison, Delta, MetricKey, TestRow } from './types.ts';

const COLORS: Record<string, string> = { ink: '#12211B', green: '#0F4B39', muted: '#5B6B63', line: '#D5DDD8', good: '#1E8E5A', ok: '#B8860B', poor: '#C23B2E' };
const MARGIN = 48;

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '...' : s);
const shortUrl = (u: string, n = 70) => { try { const x = new URL(u); return trunc(x.host + x.pathname + x.search, n); } catch { return trunc(u, n); } };

type Doc = InstanceType<typeof PDFDocument>;

function ensureSpace(doc: Doc, h: number) {
  if (doc.y + h > doc.page.height - MARGIN) doc.addPage();
}

function table(doc: Doc, headers: string[], rows: unknown[][], widths: number[]) {
  const startX = MARGIN;
  const drawRow = (cells: unknown[], bold: boolean, color?: string) => {
    ensureSpace(doc, 18);
    const y = doc.y;
    let x = startX;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(color || COLORS.ink);
    cells.forEach((c, i) => {
      doc.text(String(c), x, y, { width: widths[i] - 6, lineBreak: false });
      x += widths[i];
    });
    doc.y = y + 14;
    doc.moveTo(startX, doc.y - 2).lineTo(startX + widths.reduce((a, b) => a + b, 0), doc.y - 2).strokeColor(COLORS.line).lineWidth(0.5).stroke();
  };
  drawRow(headers, true, COLORS.muted);
  if (!rows.length) drawRow(['None found'], false, COLORS.muted);
  rows.forEach((r) => drawRow(r, false));
  doc.x = MARGIN;
  doc.moveDown(0.6);
}

function deltaText(d: Delta | undefined, key: MetricKey): string {
  if (!d) return '';
  const m = METRICS.find((x) => x.key === key);
  const sign = d.diff > 0 ? '+' : d.diff < 0 ? '-' : '';
  const abs = Math.abs(d.diff);
  const val = key === 'score' || !m ? String(Math.round(abs)) : formatValue(m.fmt, abs);
  const tag = d.status === 'better' ? 'better' : d.status === 'worse' ? 'worse' : 'same';
  return d.status === 'same' ? 'no change' : `${sign}${val} (${tag})`;
}

/** Genera el PDF de un lote (mobile + desktop) y devuelve un Buffer. */
export function buildPdf(items: (TestRow & { comparison: Comparison | null })[]): Promise<Buffer> {
  const tests = items;
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: 'Casino performance report' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const first = tests[0];
    const pageLabel = PAGE_TYPES.find((p) => p.id === first.pageType)?.label || first.pageType;

    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.green).text('Casino performance report');
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(COLORS.ink)
      .text(`URL: ${first.url}`)
      .text(`Page type: ${pageLabel}`)
      .text(`Date: ${new Date(first.createdAt).toLocaleString('en-GB')}`)
      .text(`Tool: Lighthouse (performance category). Runs per device: ${first.runs} (median score run reported).`);
    doc.moveDown(0.8);

    tests.forEach((t, idx) => {
      if (idx > 0) doc.addPage();
      const cmp = t.comparison;
      doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.green).text(t.device === 'mobile' ? 'Mobile' : 'Desktop');
      doc.moveDown(0.2).font('Helvetica-Bold').fontSize(12).fillColor(COLORS[rate('score', t.score) === 'none' ? 'ink' : rate('score', t.score)])
        .text(`Performance score: ${t.score} / 100`);
      if (cmp) doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`Compared with previous test on ${new Date(cmp.previousDate).toLocaleString('en-GB')} (score ${cmp.deltas.score?.previous}): ${deltaText(cmp.deltas.score, 'score')}`);
      else doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('No previous test to compare with.');
      doc.moveDown(0.6);

      table(doc, ['Metric', 'Value', 'Previous', 'Change'],
        METRICS.map((m) => [
          m.label, formatValue(m.fmt, t[m.key]),
          cmp?.deltas[m.key] ? formatValue(m.fmt, cmp.deltas[m.key]!.previous) : '-',
          cmp?.deltas[m.key] ? deltaText(cmp.deltas[m.key], m.key) : '-',
        ]),
        [190, 90, 90, 130]);

      if (t.warnings.length) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.poor).text('Warnings');
        t.warnings.forEach((w) => doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink).text(`- ${w}`, { width: 500 }));
        doc.moveDown(0.6);
      }

      const section = (title: string) => { ensureSpace(doc, 50); doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.green).text(title, MARGIN, doc.y); doc.moveDown(0.3); };

      section('Five slowest API requests');
      table(doc, ['Request', 'Duration', 'Status', 'Size'],
        t.findings.slowApis.map((r) => [shortUrl(r.url, 62), `${Math.round(r.duration)} ms`, r.status ?? '-', formatBytes(r.size)]),
        [300, 70, 50, 80]);

      section('Oversized images');
      table(doc, ['Image', 'Size'], t.findings.bigImages.map((r) => [shortUrl(r.url, 85), formatBytes(r.size)]), [400, 100]);

      section('Oversized JavaScript files');
      table(doc, ['Script', 'Size'], t.findings.bigScripts.map((r) => [shortUrl(r.url, 85), formatBytes(r.size)]), [400, 100]);

      const sv = t.findings.savings || {};
      const sr = Object.entries({ 'Unused JavaScript': sv.unusedJs, 'Unminified JavaScript': sv.unminifiedJs, 'Oversized images': sv.oversizedImages, 'Modern image formats': sv.modernImageFormats }).filter(([, v]) => v != null);
      if (sr.length) { section('Estimated savings reported by Lighthouse'); table(doc, ['Opportunity', 'Potential savings'], sr.map(([k, v]) => [k, formatBytes(v)]), [300, 150]); }
    });

    doc.end();
  });
}
