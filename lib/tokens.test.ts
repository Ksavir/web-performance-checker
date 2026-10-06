import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { COLORS, RADII } from './tokens.ts';

const CSS_PATH = new URL('../app/globals.css', import.meta.url);
const toCssVar = (key: string) => `--${key.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`)}`;

/** Variables de :root cuyo valor es un color hex o un radio en px. */
function readRootTokens(): Record<string, string> {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const tokens: Record<string, string> = {};
  for (const [, name, value] of root.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (/^#[0-9a-f]{3,8}$/i.test(value) || /^\d+px$/.test(value)) tokens[name] = value.toLowerCase();
  }
  return tokens;
}

describe('tokens de diseño', () => {
  it('lib/tokens.ts tiene los mismos colores y radios que :root en globals.css', () => {
    // Arrange
    const fromTs = Object.fromEntries(Object.entries({ ...COLORS, ...RADII }).map(([key, value]) => [toCssVar(key), value]));

    // Act
    const fromCss = readRootTokens();

    // Assert
    expect(fromTs).toEqual(fromCss);
  });

  it('globals.css no usa colores hex fuera de :root', () => {
    // Arrange
    const css = fs.readFileSync(CSS_PATH, 'utf8');
    const outsideRoot = css.slice(css.indexOf('}', css.indexOf(':root {')) + 1);

    // Act
    const stray = outsideRoot.match(/#[0-9a-f]{3,8}\b/gi) ?? [];

    // Assert
    expect(stray).toEqual([]);
  });
});
