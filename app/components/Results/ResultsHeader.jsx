import { PAGE_TYPES, getDeviceLabel, getNetworkLabel, resolveNetwork } from '@/lib/config';
import { formatDate } from '@/lib/format';
import { useExportPdf } from '@/app/hooks/useExportPdf';
import { ERROR } from '../ui/styles';

/** Red del lote; las pruebas antiguas pueden tener una distinta por dispositivo. */
function describeNetworks(results) {
  const networks = new Set(results.map(resolveNetwork));
  if (networks.size === 1) return getNetworkLabel(resolveNetwork(results[0]));
  return results.map((result) => `${getNetworkLabel(resolveNetwork(result))} on ${getDeviceLabel(result.device)}`).join(', ');
}

/** Título del lote (tipo de página, fecha, URL, red) y exportación a PDF. */
export default function ResultsHeader({ results }) {
  const [first] = results;
  const { busy, error, exportPdf } = useExportPdf(results);
  const pageLabel = PAGE_TYPES.find((p) => p.id === first.pageType)?.label;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <h2 className="m-0 text-lg font-bold tracking-[-0.01em]">{pageLabel} · {formatDate(first.createdAt)}</h2>
          <div className="text-[13.5px] text-muted [overflow-wrap:anywhere]">{first.url} · {describeNetworks(results)}{first.runs > 1 ? ` · median of ${first.runs} runs` : ''}</div>
        </div>
        <button type="button" className="cursor-pointer rounded-sm border border-line-strong bg-panel px-4 py-2 text-sm font-semibold text-ink no-underline transition-colors hover:bg-sunken disabled:cursor-wait disabled:opacity-60" onClick={exportPdf} disabled={busy}>{busy ? 'Preparing PDF…' : 'Export PDF'}</button>
      </div>
      {error && <div className={`${ERROR} mx-6 mb-4`} role="alert">{error}</div>}
    </>
  );
}
