import { describe, it, expect } from 'vitest';
import { formatBytes, formatDate, formatEta, formatMs, formatValue, shortUrl } from './format.ts';

describe('formatValue', () => {
  it.each([
    ['ms', 850, '850 ms'],
    ['ms', 22200, '22.20 s'],
    ['cls', 0.1, '0.100'],
    ['bytes', 5.63 * 1024 * 1024, '5.63 MB'],
    ['int', 58.6, '59'],
  ] as const)('formatea %s %d como "%s"', (format, value, expected) => {
    // Act
    const text = formatValue(format, value);

    // Assert
    expect(text).toBe(expected);
  });

  it('muestra un guion cuando no hay valor', () => {
    // Act
    const text = formatValue('ms', null);

    // Assert
    expect(text).toBe('–');
  });
});

describe('formatBytes', () => {
  it.each([
    [512, '512 B'],
    [200 * 1024, '200 KB'],
    [3 * 1024 * 1024, '3.00 MB'],
  ])('formatea %d bytes como "%s"', (bytes, expected) => {
    // Act
    const text = formatBytes(bytes);

    // Assert
    expect(text).toBe(expected);
  });
});

describe('formatMs', () => {
  it('redondea los milisegundos por debajo de un segundo', () => {
    // Act
    const text = formatMs(86.6);

    // Assert
    expect(text).toBe('87 ms');
  });
});

describe('formatDate', () => {
  it.each([
    ['medium', '1 Oct 2026, 10:30'],
    ['short', '1 Oct, 10:30'],
  ] as const)('usa el formato "%s"', (format, expected) => {
    // Arrange
    const iso = new Date(2026, 9, 1, 10, 30).toISOString();

    // Act
    const text = formatDate(iso, { format });

    // Assert
    expect(text).toBe(expected);
  });
});

describe('formatEta', () => {
  it.each([
    [400, 'About 1 s left'],
    [42_000, 'About 42 s left'],
    [150_000, 'About 3 min left'],
  ])('formatea %d ms como "%s"', (ms, expected) => {
    // Act
    const text = formatEta(ms);

    // Assert
    expect(text).toBe(expected);
  });
});

describe('shortUrl', () => {
  it('quita el protocolo y conserva la ruta y la consulta', () => {
    // Act
    const text = shortUrl('https://example.com/api/promos?x=1');

    // Assert
    expect(text).toBe('example.com/api/promos?x=1');
  });

  it('puede omitir la consulta y la ruta raíz', () => {
    // Act
    const withoutSearch = shortUrl('https://example.com/lobby?ref=1', { includeSearch: false });
    const root = shortUrl('https://example.com/', { hideRootPath: true });

    // Assert
    expect(withoutSearch).toBe('example.com/lobby');
    expect(root).toBe('example.com');
  });

  it('recorta con «…» cuando supera la longitud máxima', () => {
    // Act
    const text = shortUrl('https://example.com/a/very/long/path', { maxLength: 15 });

    // Assert
    expect(text).toBe('example.com/a/…');
  });

  it('devuelve el texto tal cual si no es una URL', () => {
    // Act
    const text = shortUrl('node_modules/@guardian/source');

    // Assert
    expect(text).toBe('node_modules/@guardian/source');
  });
});
