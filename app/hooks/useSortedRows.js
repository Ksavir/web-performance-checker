import { useMemo, useState } from 'react';

const ASCENDING = 1;
const DESCENDING = -1;

function compareValues(a, b) {
  if (typeof a === 'string') return a.localeCompare(b);
  return (a ?? -1) - (b ?? -1);
}

/**
 * Orden por columna para DataTable. Las columnas numéricas empiezan de mayor a menor
 * y las de texto de la A a la Z; un segundo clic invierte el orden.
 */
export function useSortedRows(rows, columns) {
  const [sort, setSort] = useState(null);

  const toggleSort = (column) => setSort((current) => (current?.header === column.header
    ? { header: column.header, direction: -current.direction }
    : { header: column.header, direction: column.numeric ? DESCENDING : ASCENDING }));

  const sortedRows = useMemo(() => {
    const column = sort && columns.find((c) => c.header === sort.header);
    if (!column) return rows;
    return [...rows].sort((a, b) => compareValues(column.sortValue(a), column.sortValue(b)) * sort.direction);
  }, [rows, columns, sort]);

  const ariaSort = (column) => {
    if (sort?.header !== column.header) return undefined;
    return sort.direction === ASCENDING ? 'ascending' : 'descending';
  };

  return { sortedRows, toggleSort, ariaSort };
}
