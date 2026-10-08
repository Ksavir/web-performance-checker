import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { COLORS, RADII } from './tokens.ts';

const CSS_PATH = new URL('../app/globals.css', import.meta.url);
const toCssVar = (key: string) => `--${key.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`)}`;

/** Variables del bloque @theme cuyo valor es un color hex o un radio en px (sin el prefijo `color-` de Tailwind). */
function readRootTokens(): Record<string, string> {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const start = css.indexOf('@theme');
  const theme = css.slice(start, css.indexOf('\n}', start));
  const tokens: Record<string, string> = {};
  for (const [, name, value] of theme.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (/^#[0-9a-f]{3,8}$/i.test(value) || /^\d+px$/.test(value)) tokens[name.replace('--color-', '--')] = value.toLowerCase();
  }
  return tokens;
}

describe('tokens de diseño', () => {
  it('lib/tokens.ts tiene los mismos colores y radios que @theme en globals.css', () => {
    // Arrange
    const fromTs = Object.fromEntries(Object.entries({ ...COLORS, ...RADII }).map(([key, value]) => [toCssVar(key), value]));

    // Act
    const fromCss = readRootTokens();

    // Assert
    expect(fromTs).toEqual(fromCss);
  });

  it('globals.css no usa colores hex fuera de @theme', () => {
    // Arrange
    const css = fs.readFileSync(CSS_PATH, 'utf8');
    const outsideTheme = css.slice(css.indexOf('\n}', css.indexOf('@theme')) + 2);

    // Act
    const stray = outsideTheme.match(/#[0-9a-f]{3,8}\b/gi) ?? [];

    // Assert
    expect(stray).toEqual([]);
  });
});
