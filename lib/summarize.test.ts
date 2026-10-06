import { describe, it, expect } from 'vitest';
import { summarize } from './summarize.ts';
import type { Comparison, Diagnosis, Findings, Opportunity, TestResult } from './types.ts';

const KB = 1024;
const MB = 1024 * KB;

const buildDiagnosis = (overrides: Partial<Diagnosis> = {}): Diagnosis => ({
  lcp: null,
  renderBlocking: [],
  mainThread: [],
  longTasks: { count: 0, totalMs: 0, longest: null },
  opportunities: [],
  ...overrides,
});

/** Una prueba rápida y sin hallazgos; cada test cambia solo lo que necesita. */
const buildTest = (overrides: Partial<TestResult> = {}, findings: Partial<Findings> = {}): TestResult => ({
  score: 95,
  lcp: 1200,
  fcp: 800,
  tbt: 50,
  cls: 0.01,
  pageSize: 800 * KB,
  requestCount: 40,
  warnings: [],
  ...overrides,
  findings: { slowApis: [], bigImages: [], bigScripts: [], savings: {}, diagnosis: buildDiagnosis(), ...findings },
});

const opportunity = (id: string, overrides: Partial<Opportunity> = {}): Opportunity => ({ id, title: id, items: [], ...overrides });

describe('summarize: veredicto', () => {
  it('declara la página rápida cuando todo está dentro del objetivo', () => {
    // Arrange
    const test = buildTest();

    // Act
    const summary = summarize(test);

    // Assert
    expect(summary).toMatchObject({ rating: 'good', headline: 'Fast page: no major problems found', actions: [] });
  });

  it('nombra la métrica peor como problema principal', () => {
    // Arrange
    const test = buildTest({ score: 62, lcp: 22200, tbt: 248 });

    // Act
    const summary = summarize(test);

    // Assert
    expect(summary.headline).toBe('The main content appears late');
    expect(summary.detail).toContain('LCP is 22.20 s (poor; target ≤ 2.5 s). 1 other metric also needs attention.');
  });

  it('menciona el cambio de score frente a la prueba anterior', () => {
    // Arrange
    const comparison: Comparison = {
      previousId: 1,
      previousDate: '2026-01-01T00:00:00.000Z',
      deltas: { score: { previous: 51, current: 62, diff: 11, status: 'better' } },
    };
    const test = { ...buildTest({ score: 62, lcp: 22200 }), comparison };

    // Act
    const summary = summarize(test);

    // Assert
    expect(summary.detail).toContain('Score 62/100, up 11 from the previous test.');
  });
});

describe('summarize: acciones', () => {
  it('pone primero la métrica fuera de objetivo y usa el consejo de su fase dominante', () => {
    // Arrange
    const diagnosis = buildDiagnosis({
      lcp: { element: null, phases: [{ id: 'timeToFirstByte', label: 'Time to first byte', duration: 900 }, { id: 'elementRenderDelay', label: 'Render delay', duration: 100 }] },
      opportunities: [opportunity('cache-insight', { savingsMs: 600, metric: 'LCP' })],
    });
    const test = buildTest({ lcp: 5000 }, { diagnosis });

    // Act
    const [first, second] = summarize(test).actions;

    // Assert
    expect(first).toMatchObject({ id: 'lcp', priority: 'high' });
    expect(first.why).toContain('Biggest share of the delay: Time to first byte (90%).');
    expect(first.tip).toContain('The server is slow to send the HTML');
    expect(second.id).toBe('cache-insight');
  });

  it('fusiona las imágenes pesadas con el insight de imágenes de Lighthouse', () => {
    // Arrange
    const diagnosis = buildDiagnosis({ opportunities: [opportunity('image-delivery-insight', { savingsBytes: 600 * KB })] });
    const bigImages = [{ url: 'https://cdn.example.com/hero.jpg', size: 900 * KB, mime: 'image/jpeg', wasted: 600 * KB }];

    // Act
    const { actions } = summarize(buildTest({}, { diagnosis, bigImages }));

    // Assert
    expect(actions.map((a) => a.id)).toEqual(['images']);
    expect(actions[0]).toMatchObject({ priority: 'high', savingsBytes: 600 * KB });
    expect(actions[0].where[0]).toEqual({ text: 'cdn.example.com/hero.jpg', href: 'https://cdn.example.com/hero.jpg', detail: '900 KB · save ~600 KB' });
  });

  it('fusiona los scripts pesados con el JavaScript sin usar', () => {
    // Arrange
    const diagnosis = buildDiagnosis({ opportunities: [opportunity('unused-javascript', { savingsBytes: 200 * KB, savingsMs: 150, metric: 'FCP' })] });
    const bigScripts = [{ url: 'https://cdn.example.com/app.js', size: 400 * KB, unused: 200 * KB }];

    // Act
    const { actions } = summarize(buildTest({}, { diagnosis, bigScripts }));

    // Assert
    expect(actions.map((a) => a.id)).toEqual(['scripts']);
    expect(actions[0].why).toBe('1 script above 150 KB (400 KB in total). About 200 KB of JavaScript is not used while the page loads.');
  });

  it('usa los ahorros antiguos en pruebas guardadas sin diagnóstico', () => {
    // Arrange
    const test = buildTest({}, { diagnosis: undefined, savings: { unusedJs: 300 * KB, unminifiedJs: 40 * KB } });

    // Act
    const { actions } = summarize(test);

    // Assert
    expect(actions.map((a) => a.id)).toEqual(['scripts', 'unminified-javascript']);
  });

  it('ordena las oportunidades de la misma prioridad por tiempo ahorrado', () => {
    // Arrange
    const diagnosis = buildDiagnosis({
      opportunities: [
        opportunity('font-display-insight', { savingsMs: 120, metric: 'FCP' }),
        opportunity('legacy-javascript-insight', { savingsMs: 250, metric: 'LCP' }),
      ],
    });

    // Act
    const { actions } = summarize(buildTest({}, { diagnosis }));

    // Assert
    expect(actions.map((a) => [a.id, a.priority])).toEqual([['legacy-javascript-insight', 'medium'], ['font-display-insight', 'medium']]);
  });

  it.each([
    [1500, 'medium'],
    [3200, 'high'],
  ])('sugiere acelerar una API de %i ms con prioridad "%s"', (duration, priority) => {
    // Arrange
    const slowApis = [{ url: 'https://example.com/api/promos', duration, status: 200, size: 2 * KB, type: 'Fetch' }];

    // Act
    const { actions } = summarize(buildTest({}, { slowApis }));

    // Assert
    expect(actions).toEqual([expect.objectContaining({ id: 'api', priority })]);
  });

  it.each([
    [2 * MB, []],
    [5.63 * MB, ['medium']],
    [7 * MB, ['high']],
  ])('trata una página de %i bytes según su peso', (pageSize, priorities) => {
    // Act
    const { actions } = summarize(buildTest({ pageSize }));

    // Assert
    expect(actions.filter((a) => a.id === 'page-weight').map((a) => a.priority)).toEqual(priorities);
  });
});

describe('summarize: cambios y lo que funciona', () => {
  it('separa lo que empeoró de lo que mejoró y avisa si fue una sola ejecución', () => {
    // Arrange
    const comparison: Comparison = {
      previousId: 1,
      previousDate: '2026-01-01T00:00:00.000Z',
      deltas: {
        lcp: { previous: 9820, current: 22200, diff: 12380, status: 'worse' },
        fcp: { previous: 5500, current: 1230, diff: -4270, status: 'better' },
        cls: { previous: 0.003, current: 0.003, diff: 0, status: 'same' },
      },
    };
    const test = { ...buildTest(), comparison, runs: 1 };

    // Act
    const { changes } = summarize(test);

    // Assert
    expect(changes).toEqual({
      since: '2026-01-01T00:00:00.000Z',
      worse: ['LCP: 9.82 s → 22.20 s (+12.38 s)'],
      better: ['FCP: 5.50 s → 1.23 s (−4.27 s)'],
      singleRun: true,
    });
  });

  it('no incluye cambios si no hay prueba anterior', () => {
    // Act
    const { changes } = summarize(buildTest());

    // Assert
    expect(changes).toBeNull();
  });

  it('lista las métricas dentro del objetivo y los hallazgos vacíos como lo que funciona', () => {
    // Act
    const { working } = summarize(buildTest());

    // Assert
    expect(working).toEqual([
      'LCP is 1.20 s, within the 2.5 s target.',
      'FCP is 800 ms, within the 1.8 s target.',
      'TBT is 50 ms, within the 200 ms target.',
      'CLS is 0.010, within the 0.1 target.',
      'No render-blocking requests.',
      'No long main-thread tasks.',
      'No images above 200 KB.',
      'No scripts above 150 KB.',
    ]);
  });
});
