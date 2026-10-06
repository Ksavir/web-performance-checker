import { describe, it, expect } from 'vitest';
import { normalizeUrl, validateRequest } from './validate.ts';

const VALID_BODY = { url: 'https://example.com/lobby', pageType: 'lobby', devices: ['mobile'], runs: 1 };

describe('normalizeUrl', () => {
  it('añade https:// cuando falta el protocolo', () => {
    // Act
    const url = normalizeUrl('example.com/promos');

    // Assert
    expect(url).toBe('https://example.com/promos');
  });

  it('quita el fragmento (#) de la URL', () => {
    // Act
    const url = normalizeUrl('https://example.com/page#section');

    // Assert
    expect(url).toBe('https://example.com/page');
  });

  it('acepta localhost aunque no tenga punto', () => {
    // Act
    const url = normalizeUrl('http://localhost:3000');

    // Assert
    expect(url).toBe('http://localhost:3000/');
  });

  it.each([
    ['', 'Enter a URL.'],
    ['not a url', 'That URL is not valid.'],
    ['intranet', 'That URL is not valid.'],
  ])('rechaza "%s" con el mensaje "%s"', (input, message) => {
    // Act
    const run = () => normalizeUrl(input);

    // Assert
    expect(run).toThrow(message);
  });

  it('rechaza protocolos distintos de http y https', () => {
    // Act
    const run = () => normalizeUrl('ftp://example.com');

    // Assert
    expect(run).toThrow('That URL is not valid.');
  });
});

describe('validateRequest', () => {
  it('devuelve los parámetros normalizados de una petición válida', () => {
    // Act
    const params = validateRequest(VALID_BODY);

    // Assert
    expect(params).toEqual({ url: 'https://example.com/lobby', pageType: 'lobby', devices: ['mobile'], runs: 1 });
  });

  it('ordena los dispositivos (mobile antes que desktop) e ignora los desconocidos', () => {
    // Arrange
    const body = { ...VALID_BODY, devices: ['desktop', 'tablet', 'mobile'] };

    // Act
    const params = validateRequest(body);

    // Assert
    expect(params.devices).toEqual(['mobile', 'desktop']);
  });

  it('usa 1 ejecución cuando el número recibido no es 1 ni 3', () => {
    // Arrange
    const body = { ...VALID_BODY, runs: 5 };

    // Act
    const params = validateRequest(body);

    // Assert
    expect(params.runs).toBe(1);
  });

  it('acepta 3 ejecuciones', () => {
    // Act
    const params = validateRequest({ ...VALID_BODY, runs: '3' });

    // Assert
    expect(params.runs).toBe(3);
  });

  it('rechaza un tipo de página desconocido', () => {
    // Act
    const run = () => validateRequest({ ...VALID_BODY, pageType: 'casino' });

    // Assert
    expect(run).toThrow('Choose a page type.');
  });

  it('rechaza una petición sin dispositivos', () => {
    // Act
    const run = () => validateRequest({ ...VALID_BODY, devices: [] });

    // Assert
    expect(run).toThrow('Choose at least one device.');
  });
});
