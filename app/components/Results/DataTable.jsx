import { cn } from '@/lib/cn';
import { useSortedRows } from '@/app/hooks/useSortedRows';

const SORT_ARROWS = { ascending: '▲', descending: '▼' };

function SortableHeader({ column, ariaSort, onSort }) {
  return (
    <button type="button" className="sort-btn" onClick={() => onSort(column)}>
      {column.header}<span className="sort-ind" aria-hidden="true">{SORT_ARROWS[ariaSort] ?? '↕'}</span>
    </button>
  );
}

/**
 * Tabla de hallazgos con orden por columna. Cada columna define:
 * `header`, `render(row)`, y opcionalmente `sortValue(row)`, `numeric` (alineada a la derecha) y `url` (celda ancha).
 */
export default function DataTable({ rows, columns, empty }) {
  const { sortedRows, toggleSort, ariaSort } = useSortedRows(rows, columns);
  if (!rows.length) return <div className="none">{empty}</div>;

  const canSort = (column) => column.sortValue && rows.length > 1;
  return (
    <div className="table-wrap">
      <table className="ledger">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={cn(column.numeric && 'num') || undefined} aria-sort={ariaSort(column)}>
                {canSort(column) ? <SortableHeader column={column} ariaSort={ariaSort(column)} onSort={toggleSort} /> : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.header} className={cn(column.numeric && 'num', column.url && 'url-cell') || undefined}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
