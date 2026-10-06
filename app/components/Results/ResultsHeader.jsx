import { PAGE_TYPES } from '@/lib/config';
import { formatDate } from '@/lib/format';
import { useExportPdf } from '@/app/hooks/useExportPdf';

/** Título del lote (tipo de página, fecha, URL) y exportación a PDF. */
export default function ResultsHeader({ results }) {
  const [first] = results;
  const { busy, error, exportPdf } = useExportPdf(results);
  const pageLabel = PAGE_TYPES.find((p) => p.id === first.pageType)?.label;
  return (
    <>
      <div className="res-head">
        <div>
          <h2>{pageLabel} · {formatDate(first.createdAt)}</h2>
          <div className="sub">{first.url}{first.runs > 1 ? ` · median of ${first.runs} runs` : ''}</div>
        </div>
        <button type="button" className="pdf-btn" onClick={exportPdf} disabled={busy}>{busy ? 'Preparing PDF…' : 'Export PDF'}</button>
      </div>
      {error && <div className="error res-error" role="alert">{error}</div>}
    </>
  );
}
