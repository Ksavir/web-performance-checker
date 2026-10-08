import { beforeEach, describe, it, expect } from 'vitest';
import { clearBatches, deleteBatch, getBatch, listBatches, readRememberedUrls, saveBatch, saveRememberedUrls } from './storage.ts';
import type { DeviceResultEntry, TestResult } from './types.ts';

/** localStorage en memoria: Vitest corre en Node, que no lo trae por defecto. */
function installMemoryStorage() {
  const data = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  };
}

const buildResult = (score: number, lcp: number): TestResult => ({
  score, lcp, fcp: 1000, tbt: 100, cls: 0.01, pageSize: 1000, requestCount: 10, warnings: [],
  findings: { slowApis: [], bigImages: [], bigScripts: [], savings: {} },
});
const entry = (device: DeviceResultEntry['device'], score: number, lcp = 2000): DeviceResultEntry => ({ device, runs: 1, result: buildResult(score, lcp) });
const BATCH = { url: 'https://example.com/', pageType: 'homepage', network: 'slow4g' } as const;

beforeEach(installMemoryStorage);

describe('saveBatch y getBatch', () => {
  it('devuelve los dispositivos con mobile primero aunque se guarden al revés', () => {
    // Arrange
    saveBatch({ ...BATCH, batchId: 'b1', results: [entry('desktop', 90), entry('mobile', 60)] });

    // Act
    const batch = getBatch('b1');

    // Assert
    expect(batch.map((test) => test.device)).toEqual(['mobile', 'desktop']);
  });

  it('compara cada prueba con la anterior de la misma URL, tipo y dispositivo', () => {
    // Arrange
    saveBatch({ ...BATCH, batchId: 'b1', results: [entry('mobile', 60, 2000)] });
    saveBatch({ ...BATCH, pageType: 'lobby', batchId: 'other', results: [entry('mobile', 10, 9000)] });
    saveBatch({ ...BATCH, batchId: 'b2', results: [entry('mobile', 70, 3000)] });

    // Act
    const [mobile] = getBatch('b2');

    // Assert
    expect(mobile.comparison?.deltas.lcp).toMatchObject({ previous: 2000, current: 3000, status: 'worse' });
  });

  it('no compara pruebas hechas con redes distintas', () => {
    // Arrange
    saveBatch({ ...BATCH, network: '3g', batchId: 'slow', results: [entry('mobile', 40, 9000)] });
    saveBatch({ ...BATCH, network: 'fast4g', batchId: 'fast', results: [entry('mobile', 90, 1500)] });

    // Act
    const [mobile] = getBatch('fast');

    // Assert
    expect(mobile.comparison).toBeNull();
  });

  it('compara una prueba en Slow 4G con una antigua de mobile guardada sin red', () => {
    // Arrange
    const legacy = { ...buildResult(50, 2500), id: 1, batchId: 'old', url: BATCH.url, pageType: BATCH.pageType, device: 'mobile', createdAt: '2026-01-01T00:00:00.000Z', runs: 1 };
    localStorage.setItem('casino-perf:tests', JSON.stringify([legacy]));
    saveBatch({ ...BATCH, batchId: 'new', results: [entry('mobile', 60, 2000)] });

    // Act
    const [mobile] = getBatch('new');

    // Assert
    expect(mobile.comparison?.previousId).toBe(1);
  });

  it('no compara la primera prueba de una página', () => {
    // Arrange
    saveBatch({ ...BATCH, batchId: 'b1', results: [entry('mobile', 60)] });

    // Act
    const [mobile] = getBatch('b1');

    // Assert
    expect(mobile.comparison).toBeNull();
  });
});

describe('listBatches, deleteBatch y clearBatches', () => {
  it('lista los lotes del más nuevo al más antiguo con el score de cada dispositivo', () => {
    // Arrange
    saveBatch({ ...BATCH, batchId: 'old', results: [entry('mobile', 50)] });
    saveBatch({ ...BATCH, batchId: 'new', results: [entry('mobile', 60), entry('desktop', 90)] });

    // Act
    const batches = listBatches();

    // Assert
    expect(batches.map((b) => [b.batchId, b.scores])).toEqual([['new', { mobile: 60, desktop: 90 }], ['old', { mobile: 50 }]]);
  });

  it('borra un lote sin tocar los demás', () => {
    // Arrange
    saveBatch({ ...BATCH, batchId: 'keep', results: [entry('mobile', 50)] });
    saveBatch({ ...BATCH, batchId: 'drop', results: [entry('mobile', 60)] });

    // Act
    deleteBatch('drop');

    // Assert
    expect(listBatches().map((b) => b.batchId)).toEqual(['keep']);
  });

  it('vacía el historial', () => {
    // Arrange
    saveBatch({ ...BATCH, batchId: 'b1', results: [entry('mobile', 50)] });

    // Act
    clearBatches();

    // Assert
    expect(listBatches()).toEqual([]);
  });
});

describe('URLs recordadas', () => {
  it('guarda y lee la última URL de cada tipo de página', () => {
    // Arrange
    saveRememberedUrls({ lobby: 'https://example.com/lobby' });

    // Act
    const urls = readRememberedUrls();

    // Assert
    expect(urls).toEqual({ lobby: 'https://example.com/lobby' });
  });

  it('devuelve un objeto vacío si lo guardado no es JSON válido', () => {
    // Arrange
    localStorage.setItem('casino-perf:urls', '{broken');

    // Act
    const urls = readRememberedUrls();

    // Assert
    expect(urls).toEqual({});
  });
});
