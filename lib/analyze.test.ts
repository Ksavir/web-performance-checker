import { describe, it, expect } from 'vitest';
import fixture from './__fixtures__/lhr-news-mobile.json';
import { extract, pickMedian } from './analyze.ts';
import type { Lhr, LhrItem } from './types.ts';

const URL_TESTED = 'https://www.theguardian.com/international';
// Informe real recortado: TypeScript infiere el JSON con tipos más amplios que Lhr.
const realReport = fixture as unknown as Lhr;
const KB = 1024;

/** LHR mínimo: solo el score y las auditorías que cada test necesita. */
const buildLhr = (audits: Lhr['audits'] = {}, extra: Partial<Lhr> = {}): Lhr => ({
  categories: { performance: { score: 0.5 } },
  audits,
  ...extra,
});
const networkRequests = (...items: LhrItem[]) => ({ 'network-requests': { details: { items } } });

describe('extract', () => {
  it('lee el score y las métricas principales de un informe real', () => {
    // Act
    const result = extract(realReport, URL_TESTED);

    // Assert
    expect(result).toMatchObject({ score: 74, requestCount: 106 });
    expect(result.lcp).toBeCloseTo(5040, -1);
    expect(result.cls).toBeCloseTo(0.009, 3);
  });

  it('ordena las peticiones API por duración y se queda con 5', () => {
    // Act
    const { slowApis } = extract(realReport, URL_TESTED).findings;

    // Assert
    const durations = slowApis.map((r) => r.duration);
    expect(slowApis).toHaveLength(5);
    expect(durations).toEqual([...durations].sort((a, b) => b - a));
  });

  it('desglosa el LCP en sus cuatro fases con las etiquetas de la app', () => {
    // Act
    const { diagnosis } = extract(realReport, URL_TESTED).findings;

    // Assert
    expect(diagnosis?.lcp?.phases.map((p) => p.label)).toEqual(['Time to first byte', 'Load delay', 'Load time', 'Render delay']);
    expect(diagnosis?.lcp?.element?.selector).toContain('img.dcr-11wzo8p');
  });

  it('ordena las oportunidades por tiempo ahorrado e ignora las auditorías aprobadas', () => {
    // Act
    const { diagnosis } = extract(realReport, URL_TESTED).findings;

    // Assert
    const ids = diagnosis?.opportunities.map((o) => o.id);
    expect(ids?.slice(0, 3)).toEqual(['unused-javascript', 'cache-insight', 'legacy-javascript-insight']);
    expect(ids).not.toContain('unused-css-rules');
  });

  it('describe cada archivo de una oportunidad (por ejemplo, el % sin usar)', () => {
    // Act
    const { diagnosis } = extract(realReport, URL_TESTED).findings;

    // Assert
    const unusedJs = diagnosis?.opportunities.find((o) => o.id === 'unused-javascript');
    expect(unusedJs?.items[0]).toMatchObject({ detail: '67% unused' });
  });

  it('suma los ahorros de imágenes del insight unificado de Lighthouse 13', () => {
    // Act
    const { savings } = extract(realReport, URL_TESTED).findings;

    // Assert
    expect(savings.oversizedImages).toBeGreaterThan(100 * KB);
  });

  it('marca una imagen pesada con el motivo y el ahorro que da Lighthouse', () => {
    // Arrange
    const heroUrl = 'https://cdn.example.com/hero.jpg';
    const lhr = buildLhr({
      ...networkRequests({ url: heroUrl, resourceType: 'Image', mimeType: 'image/jpeg', transferSize: 300 * KB }),
      'image-delivery-insight': {
        score: 0,
        details: { items: [{ url: heroUrl, wastedBytes: 120 * KB, subItems: { items: [{ reason: 'Use responsive images.' }] } }] },
      },
    });

    // Act
    const { bigImages } = extract(lhr).findings;

    // Assert
    expect(bigImages).toEqual([{ url: heroUrl, size: 300 * KB, mime: 'image/jpeg', hint: 'Use responsive images.', wasted: 120 * KB }]);
  });

  it('añade a un script pesado los bytes que no se usan al cargar', () => {
    // Arrange
    const appUrl = 'https://cdn.example.com/app.js';
    const lhr = buildLhr({
      ...networkRequests({ url: appUrl, resourceType: 'Script', transferSize: 400 * KB }),
      'unused-javascript': { score: 0, details: { items: [{ url: appUrl, wastedBytes: 250 * KB }] } },
    });

    // Act
    const { bigScripts } = extract(lhr).findings;

    // Assert
    expect(bigScripts).toEqual([{ url: appUrl, size: 400 * KB, unused: 250 * KB }]);
  });

  it('avisa cuando el documento principal responde con HTTP 4xx', () => {
    // Arrange
    const lhr = buildLhr(networkRequests({ url: 'https://example.com/', resourceType: 'Document', statusCode: 403 }));

    // Act
    const { warnings } = extract(lhr);

    // Assert
    expect(warnings).toEqual([expect.stringContaining('HTTP 403')]);
  });

  it('avisa cuando la página redirige a otra ruta', () => {
    // Arrange
    const lhr = buildLhr({}, { finalDisplayedUrl: 'https://example.com/age-gate' });

    // Act
    const { warnings } = extract(lhr, 'https://example.com/lobby');

    // Assert
    expect(warnings).toEqual([expect.stringContaining('redirected to https://example.com/age-gate')]);
  });

  it('no avisa si solo cambia la barra final de la URL', () => {
    // Arrange
    const lhr = buildLhr({}, { finalDisplayedUrl: 'https://example.com/lobby/' });

    // Act
    const { warnings } = extract(lhr, 'https://example.com/lobby');

    // Assert
    expect(warnings).toEqual([]);
  });

  it('lanza un error cuando Lighthouse reporta un runtimeError', () => {
    // Arrange
    const lhr = buildLhr({}, { runtimeError: { code: 'NO_FCP', message: 'The page did not paint any content.' } });

    // Act
    const run = () => extract(lhr);

    // Assert
    expect(run).toThrow('Lighthouse error: The page did not paint any content.');
  });

  it('lanza un error cuando no hay score de rendimiento', () => {
    // Arrange
    const lhr = buildLhr({}, { categories: { performance: { score: null } } });

    // Act
    const run = () => extract(lhr);

    // Assert
    expect(run).toThrow('could not compute a performance score');
  });
});

describe('pickMedian', () => {
  it('devuelve la corrida con el score mediano', () => {
    // Arrange
    const runs = [{ score: 80, id: 'a' }, { score: 40, id: 'b' }, { score: 60, id: 'c' }];

    // Act
    const median = pickMedian(runs);

    // Assert
    expect(median.id).toBe('c');
  });
});
