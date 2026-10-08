import { useEffect, useState } from 'react';
import { DEVICES, PAGE_TYPES, rate } from '@/lib/config';
import { formatDate, shortUrl } from '@/lib/format';
import Icon from '../ui/Icon';
import Tabs from '../ui/Tabs';
import { DANGER_BUTTON, GHOST_BUTTON, NONE, PANEL, RATING, RATING_PILL } from '../ui/styles';

const formatPageUrl = (url) => shortUrl(url, { includeSearch: false, hideRootPath: true });

function ClearHistoryConfirm({ onConfirm, onCancel }) {
  return (
    <div className="mb-2.5 rounded-sm border border-poor-border bg-poor-soft p-3 text-[13.5px]" role="alertdialog" aria-label="Confirm clearing history">
      <p className="m-0 mb-2.5 text-poor-ink">Delete all saved tests from this browser? This can’t be undone.</p>
      <div className="flex gap-2">
        <button type="button" className={`${DANGER_BUTTON} px-3.5 py-[7px] text-[13.5px]`} onClick={onConfirm}>Delete all</button>
        <button type="button" className={`${GHOST_BUTTON} px-3.5 py-[7px] text-[13.5px]`} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function DeviceScores({ scores }) {
  return (
    <span>
      {DEVICES.filter((device) => scores[device.id] != null && scores[device.id] >= 0).map((device) => (
        <span key={device.id} className={`${RATING_PILL} ${RATING[rate('score', scores[device.id])]} ml-1 inline-block px-2 text-xs`} title={device.id}>{device.short} {scores[device.id]}</span>
      ))}
    </span>
  );
}

/** `deleting` muestra la confirmación de borrado; solo un elemento la tiene abierta a la vez. */
function HistoryItem({ batch, active, deleting, onOpen, onDeletingChange, onDelete }) {
  return (
    <li className="relative">
      <button className={`w-full cursor-pointer rounded-sm border py-[9px] pr-10 pl-2.5 text-left transition-colors ${active ? 'border-line-strong bg-accent-soft' : 'border-transparent bg-transparent hover:bg-sunken'}`} aria-current={active} onClick={() => onOpen(batch.batchId)}>
        <div className="text-[13.5px] font-semibold [overflow-wrap:anywhere]">{formatPageUrl(batch.url)}</div>
        <div className="mt-[3px] flex flex-wrap justify-between gap-2 text-[12.5px] text-muted">
          <span>{formatDate(batch.createdAt, { format: 'short' })}</span>
          <DeviceScores scores={batch.scores} />
        </div>
      </button>
      {deleting ? (
        <div className="mt-1 mb-0.5 flex flex-wrap items-center gap-1.5 rounded-sm border border-poor-border bg-poor-soft px-2.5 py-2 text-[13px] text-poor-ink" role="alertdialog" aria-label="Confirm deleting this test">
          <span className="basis-full font-semibold">Delete this test?</span>
          <button type="button" className={`${DANGER_BUTTON} px-3 py-1 text-[13px]`} onClick={() => onDelete(batch.batchId)}>Delete</button>
          <button type="button" className={`${GHOST_BUTTON} px-3 py-1 text-[13px]`} onClick={() => onDeletingChange(null)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="absolute top-1.5 right-1.5 grid size-7 cursor-pointer place-items-center rounded-xs border-0 bg-transparent p-0 text-faint hover:bg-poor-soft hover:text-poor focus-visible:bg-poor-soft focus-visible:text-poor" aria-label={`Delete test for ${formatPageUrl(batch.url)}`} title="Delete this test" onClick={() => onDeletingChange(batch.batchId)}>
          <Icon name="trash" />
        </button>
      )}
    </li>
  );
}

/** Pruebas guardadas en este navegador, separadas por tipo de página. */
export default function History({ batches, activeId, onOpen, onClear, onDelete }) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pageType, setPageType] = useState(PAGE_TYPES[0].id);
  const deleteBatch = (batchId) => { onDelete(batchId); setDeletingId(null); };

  // Al abrir una prueba (o al terminar una nueva) se muestra la pestaña de su tipo de página.
  const activeType = batches.find((batch) => batch.batchId === activeId)?.pageType;
  useEffect(() => { if (activeType) setPageType(activeType); }, [activeType, activeId]);

  const countOf = (type) => batches.filter((batch) => batch.pageType === type).length;
  const visible = batches.filter((batch) => batch.pageType === pageType);
  const pageLabel = PAGE_TYPES.find((p) => p.id === pageType)?.label;
  const emptyText = batches.length === 0 ? 'Saved tests will be listed here.' : `No ${pageLabel} tests yet.`;

  return (
    <aside className={`${PANEL} p-4`} aria-label="Previous tests">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[15px] font-bold">Previous tests</h2>
        {batches.length > 0 && !confirmingClear && (
          <button type="button" className="cursor-pointer rounded-xs border-0 bg-transparent px-2 py-1 text-[13px] font-semibold text-muted hover:bg-poor-soft hover:text-poor" onClick={() => setConfirmingClear(true)}>Clear history</button>
        )}
      </div>
      {confirmingClear && (
        <ClearHistoryConfirm onConfirm={() => { onClear(); setConfirmingClear(false); }} onCancel={() => setConfirmingClear(false)} />
      )}
      <Tabs value={pageType} onChange={setPageType} variant="compact">
        <Tabs.List label="Page type">
          {PAGE_TYPES.map((type) => <Tabs.Tab key={type.id} value={type.id} count={countOf(type.id)}>{type.label}</Tabs.Tab>)}
        </Tabs.List>
        <Tabs.Panel>
          {visible.length === 0 ? <div className={NONE}>{emptyText}</div> : (
            <ul className="m-0 grid max-h-[340px] list-none gap-1 overflow-y-auto p-0">
              {visible.map((batch) => (
                <HistoryItem key={batch.batchId} batch={batch} active={batch.batchId === activeId} deleting={batch.batchId === deletingId}
                  onOpen={onOpen} onDeletingChange={setDeletingId} onDelete={deleteBatch} />
              ))}
            </ul>
          )}
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}
