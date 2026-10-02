'use client';
import { useState } from 'react';
import { PAGE_TYPES, rate } from '@/lib/config';

const shortUrl = (u) => { try { const x = new URL(u); return x.host + (x.pathname === '/' ? '' : x.pathname); } catch { return u; } };

export default function History({ batches, activeId, onOpen, onClear, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  return (
    <aside className="panel hist" aria-label="Previous tests">
      <div className="hist-head">
        <h2>Previous tests</h2>
        {batches.length > 0 && !confirming && (
          <button type="button" className="link-btn" onClick={() => setConfirming(true)}>Clear history</button>
        )}
      </div>
      {confirming && (
        <div className="confirm" role="alertdialog" aria-label="Confirm clearing history">
          <p>Delete all saved tests from this browser? This can’t be undone.</p>
          <div className="confirm-actions">
            <button type="button" className="danger-btn" onClick={() => { onClear(); setConfirming(false); }}>Delete all</button>
            <button type="button" className="ghost-btn" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      )}
      {batches.length === 0 ? (
        <div className="none">Saved tests will be listed here.</div>
      ) : (
        <ul>
          {batches.map((b) => (
            <li key={b.batchId} className="hist-item">
              <button className="hist-open" aria-current={b.batchId === activeId} onClick={() => onOpen(b.batchId)}>
                <div className="u">{shortUrl(b.url)}</div>
                <div className="m">
                  <span>{PAGE_TYPES.find((p) => p.id === b.pageType)?.label} · {new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  <span>
                    {['mobile', 'desktop'].filter((d) => b.scores[d] != null && b.scores[d] >= 0).map((d) => (
                      <span key={d} className={`pill r-${rate('score', b.scores[d])}`} title={d}>{d === 'mobile' ? 'M' : 'D'} {b.scores[d]}</span>
                    ))}
                  </span>
                </div>
              </button>
              {deletingId === b.batchId ? (
                <div className="item-confirm" role="alertdialog" aria-label="Confirm deleting this test">
                  <span>Delete this test?</span>
                  <button type="button" className="danger-btn" onClick={() => { onDelete(b.batchId); setDeletingId(null); }}>Delete</button>
                  <button type="button" className="ghost-btn" onClick={() => setDeletingId(null)}>Cancel</button>
                </div>
              ) : (
                <button type="button" className="item-del" aria-label={`Delete test for ${shortUrl(b.url)}`} title="Delete this test" onClick={() => setDeletingId(b.batchId)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
