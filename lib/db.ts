import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Device, Findings, PageType, TestResult, TestRow } from './types.ts';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'lighthouse.db');

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      url TEXT NOT NULL,
      page_type TEXT NOT NULL,
      device TEXT NOT NULL,
      created_at TEXT NOT NULL,
      runs INTEGER NOT NULL DEFAULT 1,
      score INTEGER, lcp REAL, fcp REAL, tbt REAL, cls REAL,
      page_size INTEGER, request_count INTEGER,
      findings TEXT NOT NULL,
      warnings TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_tests_key ON tests (url, page_type, device, id);
    CREATE INDEX IF NOT EXISTS idx_tests_batch ON tests (batch_id);
  `);
  return db;
}

// Singleton que sobrevive al hot-reload de Next en desarrollo.
const g = globalThis as typeof globalThis & { __db?: Database.Database };
export const db: Database.Database = (g.__db ??= open());

const toRow = (r: any): TestRow => ({
  id: r.id,
  batchId: r.batch_id,
  url: r.url,
  pageType: r.page_type,
  device: r.device,
  createdAt: r.created_at,
  runs: r.runs,
  score: r.score,
  lcp: r.lcp,
  fcp: r.fcp,
  tbt: r.tbt,
  cls: r.cls,
  pageSize: r.page_size,
  requestCount: r.request_count,
  findings: JSON.parse(r.findings),
  warnings: JSON.parse(r.warnings || '[]'),
});

export function saveTest({ batchId, url, pageType, device, runs, result }: {
  batchId: string;
  url: string;
  pageType: PageType;
  device: Device;
  runs: number;
  result: TestResult;
}): number {
  const info = db
    .prepare(
      `INSERT INTO tests (batch_id, url, page_type, device, created_at, runs, score, lcp, fcp, tbt, cls, page_size, request_count, findings, warnings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      batchId, url, pageType, device, new Date().toISOString(), runs,
      result.score, result.lcp, result.fcp, result.tbt, result.cls,
      Math.round(result.pageSize), result.requestCount,
      JSON.stringify(result.findings), JSON.stringify(result.warnings || [])
    );
  return Number(info.lastInsertRowid);
}

export const getTest = (id: number | string): TestRow | null => {
  const r = db.prepare('SELECT * FROM tests WHERE id = ?').get(id);
  return r ? toRow(r) : null;
};

export const getBatch = (batchId: string): TestRow[] =>
  db.prepare('SELECT * FROM tests WHERE batch_id = ? ORDER BY device DESC').all(batchId).map(toRow);

/** Resultado anterior de la misma URL + tipo de página + dispositivo. */
export const getPrevious = (t: Pick<TestRow, 'url' | 'pageType' | 'device' | 'id'>): TestRow | null => {
  const r = db
    .prepare('SELECT * FROM tests WHERE url = ? AND page_type = ? AND device = ? AND id < ? ORDER BY id DESC LIMIT 1')
    .get(t.url, t.pageType, t.device, t.id);
  return r ? toRow(r) : null;
};

/** Lista de lotes recientes (un lote = una ejecución con uno o dos dispositivos). */
export function listBatches(limit = 30) {
  type BatchRow = { batch_id: string; url: string; page_type: PageType; created_at: string; scores: string };
  const rows = db
    .prepare(
      `SELECT batch_id, url, page_type, MIN(created_at) AS created_at,
              GROUP_CONCAT(device || ':' || COALESCE(score, -1)) AS scores
       FROM tests GROUP BY batch_id ORDER BY MAX(id) DESC LIMIT ?`
    )
    .all(limit) as BatchRow[];
  return rows.map((r) => ({
    batchId: r.batch_id,
    url: r.url,
    pageType: r.page_type,
    createdAt: r.created_at,
    scores: Object.fromEntries(r.scores.split(',').map((s) => { const [d, v] = s.split(':'); return [d, Number(v)] as const; })),
  }));
}
