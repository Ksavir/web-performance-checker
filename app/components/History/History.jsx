import { useEffect, useState } from 'react';
import { DEVICES, PAGE_TYPES, rate } from '@/lib/config';
import { formatDate, shortUrl } from '@/lib/format';
import Icon from '../ui/Icon';
import Tabs from '../ui/Tabs';

const formatPageUrl = (url) => shortUrl(url, { includeSearch: false, hideRootPath: true });

function ClearHistoryConfirm({ onConfirm, onCancel }) {
  return (
    <div className="confirm" role="alertdialog" aria-label="Confirm clearing history">
      <p>Delete all saved tests from this browser? This can’t be undone.</p>
      <div className="confirm-actions">
        <button type="button" className="danger-btn" onClick={onConfirm}>Delete all</button>
        <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function DeviceScores({ scores }) {
  return (
    <span>
      {DEVICES.filter((device) => scores[device.id] != null && scores[device.id] >= 0).map((device) => (
        <span key={device.id} className={`pill r-${rate('score', scores[device.id])}`} title={device.id}>{device.short} {scores[device.id]}</span>
      ))}
    </span>
  );
}

/** `deleting` muestra la confirmación de borrado; solo un elemento la tiene abierta a la vez. */
function HistoryItem({ batch, active, deleting, onOpen, onDeletingChange, onDelete }) {
  return (
    <li className="hist-item">
      <button className="hist-open" aria-current={active} onClick={() => onOpen(batch.batchId)}>
        <div className="u">{formatPageUrl(batch.url)}</div>
        <div className="m">
          <span>{formatDate(batch.createdAt, { format: 'short' })}</span>
          <DeviceScores scores={batch.scores} />
        </div>
      </button>
      {deleting ? (
        <div className="item-confirm" role="alertdialog" aria-label="Confirm deleting this test">
          <span>Delete this test?</span>
          <button type="button" className="danger-btn" onClick={() => onDelete(batch.batchId)}>Delete</button>
          <button type="button" className="ghost-btn" onClick={() => onDeletingChange(null)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="item-del" aria-label={`Delete test for ${formatPageUrl(batch.url)}`} title="Delete this test" onClick={() => onDeletingChange(batch.batchId)}>
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
    <aside className="panel hist" aria-label="Previous tests">
      <div className="hist-head">
        <h2>Previous tests</h2>
        {batches.length > 0 && !confirmingClear && (
          <button type="button" className="link-btn" onClick={() => setConfirmingClear(true)}>Clear history</button>
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
          {visible.length === 0 ? <div className="none">{emptyText}</div> : (
            <ul>
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
