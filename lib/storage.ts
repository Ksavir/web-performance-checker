import { compare } from './compare.ts';
import type { Comparison, Device, PageType, TestResult, TestRow } from './types.ts';

// Historial guardado en el navegador (localStorage). Reemplaza a la base de datos.
const KEY = 'casino-perf:tests';
const MAX_TESTS = 100;

export type BatchSummary = { batchId: string; url: string; pageType: PageType; createdAt: string; scores: Partial<Record<Device, number>> };
export type BatchResult = TestRow & { comparison: Comparison | null };

function read(): TestRow[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function write(tests: TestRow[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(tests)); return true; } catch { return false; }
}

/** Guarda un lote (uno o dos dispositivos). Devuelve false si el navegador no permite guardar. */
export function saveBatch(batchId: string, url: string, pageType: PageType, results: { device: Device; runs: number; result: TestResult }[]): boolean {
  const tests = read();
  let nextId = tests.reduce((m, t) => Math.max(m, t.id), 0) + 1;
  const createdAt = new Date().toISOString();
  for (const { device, runs, result } of results) {
    tests.push({ ...result, id: nextId++, batchId, url, pageType, device, createdAt, runs });
  }
  return write(tests.slice(-MAX_TESTS));
}

export function getBatch(batchId: string): BatchResult[] {
  const tests = read();
  return tests
    .filter((t) => t.batchId === batchId)
    .sort((a, b) => (a.device < b.device ? 1 : -1))
    .map((t) => {
      const prev = tests.filter((p) => p.id < t.id && p.url === t.url && p.pageType === t.pageType && p.device === t.device).pop() || null;
      return { ...t, comparison: compare(t, prev) };
    });
}

/** Lotes recientes, el más nuevo primero. */
export function listBatches(): BatchSummary[] {
  const map = new Map<string, BatchSummary & { last: number }>();
  for (const t of read()) {
    const b = map.get(t.batchId) || { batchId: t.batchId, url: t.url, pageType: t.pageType, createdAt: t.createdAt, scores: {}, last: 0 };
    b.scores[t.device] = t.score;
    b.last = Math.max(b.last, t.id);
    map.set(t.batchId, b);
  }
  return [...map.values()].sort((a, b) => b.last - a.last).map(({ last, ...b }) => b);
}

export function deleteBatch(batchId: string) {
  write(read().filter((t) => t.batchId !== batchId));
}

export function clearAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
