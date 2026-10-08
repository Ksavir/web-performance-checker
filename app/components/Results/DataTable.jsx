import { cn } from '@/lib/cn';
import { NONE, NUMERIC, TABLE, TD, TH, URL_CELL } from '../ui/styles';
import { useSortedRows } from '@/app/hooks/useSortedRows';

const SORT_ARROWS = { ascending: '▲', descending: '▼' };

function SortableHeader({ column, ariaSort, onSort }) {
  return (
    <button type="button" className={cn('inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-[inherit] text-[inherit]', ariaSort ? 'text-accent' : 'hover:text-ink')} onClick={() => onSort(column)}>
      {column.header}<span className={cn('text-[10px]', ariaSort ? 'text-accent' : 'text-faint')} aria-hidden="true">{SORT_ARROWS[ariaSort] ?? '↕'}</span>
    </button>
  );
}

/**
 * Tabla de hallazgos con orden por columna. Cada columna define:
 * `header`, `render(row)`, y opcionalmente `sortValue(row)`, `numeric` (alineada a la derecha) y `url` (celda ancha).
 */
export default function DataTable({ rows, columns, empty }) {
  const { sortedRows, toggleSort, ariaSort } = useSortedRows(rows, columns);
  if (!rows.length) return <div className={NONE}>{empty}</div>;

  const canSort = (column) => column.sortValue && rows.length > 1;
  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={cn(TH, column.numeric && NUMERIC)} aria-sort={ariaSort(column)}>
                {canSort(column) ? <SortableHeader column={column} ariaSort={ariaSort(column)} onSort={toggleSort} /> : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={index} className="group/row">
              {columns.map((column) => (
                <td key={column.header} className={cn(TD, column.numeric && NUMERIC, column.url && URL_CELL)}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
