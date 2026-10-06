// Formateadores de texto compartidos por la interfaz, el resumen y el PDF.
import type { ValueFormat } from './types.ts';

const KB = 1024;
const MB = 1024 * KB;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** Variantes de fecha que usa la app (siempre en inglés británico: 1 Oct 2026). */
const DATE_FORMATS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  short: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  numeric: {},
};
export type DateFormat = 'medium' | 'short' | 'numeric';

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '–';
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${Math.round(bytes)} B`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '–';
  return ms >= MS_PER_SECOND ? `${(ms / MS_PER_SECOND).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

export const formatScore = (score: number): string => String(Math.round(score));

export function formatValue(format: ValueFormat, value: number | null | undefined): string {
  if (value == null) return '–';
  switch (format) {
    case 'ms':
      return formatMs(value);
    case 'cls':
      return value.toFixed(3);
    case 'bytes':
      return formatBytes(value);
    default:
      return formatScore(value);
  }
}

export function formatDate(iso: string, { format = 'medium' }: { format?: DateFormat } = {}): string {
  return new Date(iso).toLocaleString('en-GB', DATE_FORMATS[format]);
}

/** Tiempo restante de una prueba en cola, redondeado para no dar falsa precisión. */
export function formatEta(ms: number): string {
  const seconds = Math.max(Math.round(ms / MS_PER_SECOND), 1);
  return seconds < SECONDS_PER_MINUTE ? `About ${seconds} s left` : `About ${Math.round(seconds / SECONDS_PER_MINUTE)} min left`;
}

interface ShortUrlOptions {
  /** Recorta el texto con «…» si supera esta longitud. */
  maxLength?: number;
  includeSearch?: boolean;
  /** Omite la ruta cuando es solo «/» (example.com en vez de example.com/). */
  hideRootPath?: boolean;
}

/** URL sin protocolo para mostrarla en poco espacio. Si no es una URL válida, devuelve el texto tal cual. */
export function shortUrl(url: string, { maxLength, includeSearch = true, hideRootPath = false }: ShortUrlOptions = {}): string {
  let text = url;
  try {
    const parsed = new URL(url);
    const path = hideRootPath && parsed.pathname === '/' ? '' : parsed.pathname;
    text = parsed.host + path + (includeSearch ? parsed.search : '');
  } catch { /* no es una URL: se muestra tal cual */ }
  return maxLength && text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
