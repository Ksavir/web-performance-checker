// Clases de Tailwind que se repiten en varios componentes. Los tokens (colores, radios, sombras) viven en globals.css.

export const PANEL = 'rounded-panel border border-line bg-panel shadow-panel';

// Calificación -> variables --c (color) y --cs (fondo suave) que leen las etiquetas, anillos y tarjetas.
export const RATING = {
  good: '[--c:var(--color-good)] [--cs:var(--color-good-soft)]',
  ok: '[--c:var(--color-ok)] [--cs:var(--color-ok-soft)]',
  poor: '[--c:var(--color-poor)] [--cs:var(--color-poor-soft)]',
  none: '[--c:var(--color-faint)] [--cs:var(--color-sunken)]',
};
export const RATING_PILL = 'rounded-full text-(color:--c) bg-(color:--cs) font-bold';

export const HINT = 'm-0 text-[13px] text-muted';
export const NOTE = 'mb-2 mt-0 text-[13px] text-muted';
export const NONE = 'py-2 text-sm text-muted';
export const SECTION = 'border-t border-line px-6 pt-1 pb-6';
export const SECTION_TITLE = 'mt-[22px] mb-0.5 text-[15px] font-bold';
export const MINI_TITLE = 'm-0 mb-0.5 text-xs font-bold tracking-[.04em] text-muted uppercase';
export const CODE = 'rounded-xs bg-sunken px-1.5 py-0.5 font-mono text-[12.5px] [overflow-wrap:anywhere]';
export const URL_LINK = 'text-ink underline decoration-line-strong underline-offset-[3px] hover:text-accent hover:decoration-current';
export const ROW_HINT = 'mt-[3px] text-[12.5px] text-muted';
export const URL_WRAP = 'inline-flex items-start gap-1.5';

const ALERT_LIST = '[&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-[18px]';
export const ERROR = `rounded-sm border border-poor-border bg-poor-soft px-3.5 py-3 text-poor-ink ${ALERT_LIST}`;
export const WARN = `rounded-sm border border-ok-border bg-ok-soft px-3.5 py-3 text-[13.5px] ${ALERT_LIST}`;

const BUTTON = 'cursor-pointer rounded-sm border text-center font-semibold transition-colors disabled:opacity-60';
export const GHOST_BUTTON = `${BUTTON} border-line-strong bg-panel enabled:hover:bg-sunken disabled:cursor-wait`;
export const DANGER_BUTTON = `${BUTTON} border-poor bg-poor text-on-accent hover:bg-poor-hover`;

// Tablas de hallazgos
export const TABLE = 'w-full border-collapse [&_tr:last-child_td]:border-b-0';
export const TH = 'border-b border-line px-2.5 py-1.5 text-left text-[12.5px] font-semibold text-muted';
export const TD = 'border-b border-line p-2.5';
export const NUMERIC = 'text-right whitespace-nowrap';
export const URL_CELL = 'max-w-[520px] [overflow-wrap:anywhere]';

// Marcador de carga
export const SKELETON = 'rounded-xs bg-sunken motion-safe:animate-pulse';
