import { compare } from './compare.ts';
import { DEVICES } from './config.ts';
import type { Comparison, Device, DeviceResultEntry, PageType, TestRow } from './types.ts';

// Historial y preferencias guardados en el navegador (localStorage). Reemplazan a una base de datos.
// Todas las claves llevan el prefijo casino-perf: y se declaran aquí.
const STORAGE_KEYS = {
  tests: 'casino-perf:tests',
  urls: 'casino-perf:urls',
} as const;
const MAX_TESTS = 100;

export type BatchSummary = { batchId: string; url: string; pageType: PageType; createdAt: string; scores: Partial<Record<Device, number>> };
export type BatchResult = TestRow & { comparison: Comparison | null };
export type RememberedUrls = Partial<Record<PageType, string>>;

interface SaveBatchParams {
  batchId: string;
  url: string;
  pageType: PageType;
  results: DeviceResultEntry[];
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function writeJson(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

function readTests(): TestRow[] {
  const tests = readJson<unknown>(STORAGE_KEYS.tests, []);
  return Array.isArray(tests) ? tests : [];
}

const writeTests = (tests: TestRow[]): boolean => writeJson(STORAGE_KEYS.tests, tests);
const deviceOrder = (device: Device) => DEVICES.findIndex((entry) => entry.id === device);

/** Guarda un lote (uno o dos dispositivos). Devuelve false si el navegador no permite guardar. */
export function saveBatch({ batchId, url, pageType, results }: SaveBatchParams): boolean {
  const tests = readTests();
  let nextId = tests.reduce((max, test) => Math.max(max, test.id), 0) + 1;
  const createdAt = new Date().toISOString();
  for (const { device, runs, result } of results) {
    tests.push({ ...result, id: nextId++, batchId, url, pageType, device, createdAt, runs });
  }
  return writeTests(tests.slice(-MAX_TESTS));
}

/** Pruebas de un lote, en el orden de DEVICES, cada una comparada con la anterior de la misma URL, tipo y dispositivo. */
export function getBatch(batchId: string): BatchResult[] {
  const tests = readTests();
  return tests
    .filter((test) => test.batchId === batchId)
    .sort((a, b) => deviceOrder(a.device) - deviceOrder(b.device))
    .map((test) => {
      const previous = tests
        .filter((other) => other.id < test.id && other.url === test.url && other.pageType === test.pageType && other.device === test.device)
        .pop() ?? null;
      return { ...test, comparison: compare(test, previous) };
    });
}

/** Lotes recientes, el más nuevo primero. */
export function listBatches(): BatchSummary[] {
  const batches = new Map<string, BatchSummary & { lastId: number }>();
  for (const test of readTests()) {
    const batch = batches.get(test.batchId) ?? { batchId: test.batchId, url: test.url, pageType: test.pageType, createdAt: test.createdAt, scores: {}, lastId: 0 };
    batch.scores[test.device] = test.score;
    batch.lastId = Math.max(batch.lastId, test.id);
    batches.set(test.batchId, batch);
  }
  return [...batches.values()].sort((a, b) => b.lastId - a.lastId).map(({ lastId, ...batch }) => batch);
}

export function deleteBatch(batchId: string) {
  writeTests(readTests().filter((test) => test.batchId !== batchId));
}

export function clearBatches() {
  try { localStorage.removeItem(STORAGE_KEYS.tests); } catch { /* sin almacenamiento: no hay nada que borrar */ }
}

/** Última URL usada para cada tipo de página. */
export const readRememberedUrls = (): RememberedUrls => readJson<RememberedUrls>(STORAGE_KEYS.urls, {});

export const saveRememberedUrls = (urls: RememberedUrls): boolean => writeJson(STORAGE_KEYS.urls, urls);
