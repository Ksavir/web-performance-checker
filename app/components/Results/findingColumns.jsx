// Columnas de las tablas de hallazgos (ver DataTable): qué se muestra y por qué valor se ordena.
import { formatBytes, formatMs, shortUrl } from '@/lib/format';
import { CopyableLink, CopyableText } from './CopyableUrl';
import ImageThumb from './ImageThumb';

const byUrl = (row) => shortUrl(row.url);

const urlColumn = (header) => ({ header, url: true, sortValue: byUrl, render: (row) => <CopyableText url={row.url} /> });

const SIZE_COLUMN = { header: 'Size', numeric: true, sortValue: (row) => row.size, render: (row) => formatBytes(row.size) };

const msColumn = (header, field) => ({ header, numeric: true, sortValue: (row) => row[field], render: (row) => formatMs(row[field]) });

export const RENDER_BLOCKING_COLUMNS = [urlColumn('Request'), SIZE_COLUMN, msColumn('Blocks for', 'ms')];

export const MAIN_THREAD_COLUMNS = [urlColumn('Script'), msColumn('CPU time', 'total'), msColumn('Evaluation', 'scripting'), msColumn('Parse', 'parse')];

/** La mini barra es relativa a la petición más lenta de la tabla. */
function DurationCell({ duration, slowest }) {
  return (
    <>
      {Math.round(duration)} ms
      <div className="mt-[5px] h-1 min-w-0.5 rounded-full bg-poor opacity-60" style={{ width: `${(duration / slowest) * 100}%` }} />
    </>
  );
}

export const buildApiColumns = (slowest) => [
  urlColumn('Request'),
  { header: 'Duration', numeric: true, sortValue: (row) => row.duration, render: (row) => <DurationCell duration={row.duration} slowest={slowest} /> },
  { header: 'Status', numeric: true, sortValue: (row) => row.status, render: (row) => row.status ?? '–' },
  SIZE_COLUMN,
];

function ImageCell({ image }) {
  return (
    <div className="flex items-start gap-3">
      <ImageThumb url={image.url} />
      <div className="min-w-0"><CopyableLink url={image.url} hint={image.hint} /></div>
    </div>
  );
}

export const IMAGE_COLUMNS = [{ header: 'Image', url: true, sortValue: byUrl, render: (row) => <ImageCell image={row} /> }, SIZE_COLUMN];

export const IMAGE_SAVINGS_COLUMN = {
  header: 'Est. savings', numeric: true, sortValue: (row) => row.wasted ?? 0, render: (row) => (row.wasted ? formatBytes(row.wasted) : '–'),
};

export const SCRIPT_COLUMNS = [urlColumn('Script'), SIZE_COLUMN];

const formatUnused = (script) => `${formatBytes(script.unused)} · ${Math.round((script.unused / script.size) * 100)}%`;

export const SCRIPT_UNUSED_COLUMN = {
  header: 'Unused on load', numeric: true, sortValue: (row) => row.unused ?? 0, render: (row) => (row.unused ? formatUnused(row) : '–'),
};

/** Tabla de ahorros de las pruebas guardadas antes de que existiera el diagnóstico. */
export const LEGACY_SAVINGS_COLUMNS = [
  { header: 'Opportunity', sortValue: (row) => row.label, render: (row) => row.label },
  { header: 'Potential savings', numeric: true, sortValue: (row) => row.bytes, render: (row) => formatBytes(row.bytes) },
];
