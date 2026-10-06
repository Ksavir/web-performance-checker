import { formatBytes, formatMs } from '@/lib/format';
import Badge from '../ui/Badge';

// Prioridad -> misma escala de color que las métricas (alta = rojo, media = ámbar, baja = neutro).
const PRIORITY = {
  high: { label: 'High priority', ratingClass: 'r-poor' },
  medium: { label: 'Medium', ratingClass: 'r-ok' },
  low: { label: 'Low', ratingClass: 'r-none' },
};

function WhereToLook({ places }) {
  return (
    <div className="fix-where">
      <div className="mini-title">Where to look</div>
      <ul>
        {places.map((place, index) => (
          <li key={index}>
            {place.href
              ? <a className="url-link" href={place.href} target="_blank" rel="noopener noreferrer" title={`${place.href} (opens in a new tab)`}>{place.text}</a>
              : <code>{place.text}</code>}
            {place.detail && <span className="fix-detail"> · {place.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Una sugerencia del resumen: prioridad, ahorro estimado, evidencia, consejo y dónde mirar. */
export default function Fix({ number, action }) {
  const priority = PRIORITY[action.priority];
  return (
    <li className="fix">
      <span className="fix-num" aria-hidden="true">{number}</span>
      <div className="fix-body">
        <div className="fix-head">
          <h4 className="fix-title">{action.title}</h4>
          <span className="fix-tags">
            <span className={`prio ${priority.ratingClass}`}>{priority.label}</span>
            {action.savingsMs ? <Badge>−{formatMs(action.savingsMs)} {action.metric}</Badge> : null}
            {action.savingsBytes ? <Badge tone="muted">{formatBytes(action.savingsBytes)}</Badge> : null}
          </span>
        </div>
        <p className="fix-why">{action.why}</p>
        {action.tip && <p className="fix-tip"><strong>How to fix:</strong> {action.tip}</p>}
        {action.where.length > 0 && <WhereToLook places={action.where} />}
      </div>
    </li>
  );
}
