import { PAGE_TYPES, rate } from '@/lib/config';

const shortUrl = (u) => { try { const x = new URL(u); return x.host + (x.pathname === '/' ? '' : x.pathname); } catch { return u; } };

export default function History({ batches, activeId, onOpen }) {
  return (
    <aside className="panel hist" aria-label="Previous tests">
      <h2>Previous tests</h2>
      {batches.length === 0 ? (
        <div className="none">Saved tests will be listed here.</div>
      ) : (
        <ul>
          {batches.map((b) => (
            <li key={b.batchId}>
              <button aria-current={b.batchId === activeId} onClick={() => onOpen(b.batchId)}>
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
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
