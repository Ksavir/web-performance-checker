import { THRESHOLDS } from '@/lib/config';
import { formatBytes } from '@/lib/format';
import Accordion from '../ui/Accordion';
import DataTable from './DataTable';
import FindingBadge from './FindingBadge';
import {
  IMAGE_COLUMNS, IMAGE_SAVINGS_COLUMN, LEGACY_SAVINGS_COLUMNS, SCRIPT_COLUMNS, SCRIPT_UNUSED_COLUMN, buildApiColumns,
} from './findingColumns';

const describeTotal = (files) => (files.length ? `${files.length} · ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}` : null);

function legacySavingsRows(savings = {}) {
  return [
    { label: 'Unused JavaScript', bytes: savings.unusedJs },
    { label: 'Unminified JavaScript', bytes: savings.unminifiedJs },
    { label: 'Oversized images', bytes: savings.oversizedImages },
    { label: 'Modern image formats', bytes: savings.modernImageFormats },
  ].filter((row) => row.bytes != null);
}

/** APIs lentas, imágenes y scripts pesados (y la tabla de ahorros de las pruebas antiguas). */
export default function FindingsSections({ findings }) {
  const { slowApis, bigImages, bigScripts, diagnosis, savings } = findings;
  const slowest = Math.max(1, ...slowApis.map((request) => request.duration));
  // Las columnas de ahorro y JS sin usar dependen de datos que solo tienen las pruebas con diagnóstico.
  const imageColumns = diagnosis ? [...IMAGE_COLUMNS, IMAGE_SAVINGS_COLUMN] : IMAGE_COLUMNS;
  const scriptColumns = diagnosis ? [...SCRIPT_COLUMNS, SCRIPT_UNUSED_COLUMN] : SCRIPT_COLUMNS;
  const legacyRows = diagnosis ? [] : legacySavingsRows(savings);

  return (
    <div className="section">
      <Accordion>
        <Accordion.Summary title="Five slowest API requests" badge={<FindingBadge value={slowest > 1 ? `slowest ${Math.round(slowest)} ms` : null} />} />
        <Accordion.Body note="XHR/fetch calls and JSON responses, ordered by duration.">
          <DataTable rows={slowApis} columns={buildApiColumns(slowest)} empty="No API requests were detected on this page load." />
        </Accordion.Body>
      </Accordion>
      <Accordion>
        <Accordion.Summary title="Oversized images" badge={<FindingBadge value={describeTotal(bigImages)} />} />
        <Accordion.Body note={`Images above ${formatBytes(THRESHOLDS.imageBytes)} transferred.`}>
          <DataTable rows={bigImages} columns={imageColumns} empty="No images above the threshold." />
        </Accordion.Body>
      </Accordion>
      <Accordion>
        <Accordion.Summary title="Oversized JavaScript files" badge={<FindingBadge value={describeTotal(bigScripts)} />} />
        <Accordion.Body note={`Scripts above ${formatBytes(THRESHOLDS.scriptBytes)} transferred.`}>
          <DataTable rows={bigScripts} columns={scriptColumns} empty="No scripts above the threshold." />
        </Accordion.Body>
      </Accordion>
      {legacyRows.length > 0 && (
        <Accordion>
          <Accordion.Summary title="Estimated savings from Lighthouse" badge={<FindingBadge value={legacyRows.length} />} />
          <Accordion.Body>
            <DataTable rows={legacyRows} columns={LEGACY_SAVINGS_COLUMNS} empty="" />
          </Accordion.Body>
        </Accordion>
      )}
    </div>
  );
}
