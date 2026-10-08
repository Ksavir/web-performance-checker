import { formatBytes, formatMs } from '@/lib/format';
import Badge from '../ui/Badge';
import { CODE, MINI_TITLE, RATING, RATING_PILL, URL_LINK } from '../ui/styles';

// Prioridad -> misma escala de color que las métricas (alta = rojo, media = ámbar, baja = neutro).
const PRIORITY = {
  high: { label: 'High priority', rating: 'poor' },
  medium: { label: 'Medium', rating: 'ok' },
  low: { label: 'Low', rating: 'none' },
};

function WhereToLook({ places }) {
  return (
    <div>
      <div className={MINI_TITLE}>Where to look</div>
      <ul className="mt-1 mb-0 grid list-none gap-1 p-0 text-[12.5px]">
        {places.map((place, index) => (
          <li key={index} className="[overflow-wrap:anywhere]">
            {place.href
              ? <a className={URL_LINK} href={place.href} target="_blank" rel="noopener noreferrer" title={`${place.href} (opens in a new tab)`}>{place.text}</a>
              : <code className={`${CODE} !px-[5px] !py-px !text-xs`}>{place.text}</code>}
            {place.detail && <span className="text-muted"> · {place.detail}</span>}
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
    <li className="grid grid-cols-[26px_minmax(0,1fr)] gap-3 rounded-sm border border-line bg-panel px-4 py-3.5">
      <span className="grid size-[26px] place-items-center rounded-full bg-accent-soft text-[12.5px] font-bold text-accent" aria-hidden="true">{number}</span>
      <div className="grid min-w-0 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <h4 className="m-0 text-[14.5px] leading-[26px] font-bold">{action.title}</h4>
          <span className="flex flex-wrap gap-1.5">
            <span className={`${RATING_PILL} ${RATING[priority.rating]} px-[9px] py-px text-xs whitespace-nowrap`}>{priority.label}</span>
            {action.savingsMs ? <Badge>−{formatMs(action.savingsMs)} {action.metric}</Badge> : null}
            {action.savingsBytes ? <Badge tone="muted">{formatBytes(action.savingsBytes)}</Badge> : null}
          </span>
        </div>
        <p className="m-0 text-[13.5px] text-muted">{action.why}</p>
        {action.tip && <p className="m-0 rounded-xs bg-accent-soft px-3 py-2 text-[13.5px]"><strong>How to fix:</strong> {action.tip}</p>}
        {action.where.length > 0 && <WhereToLook places={action.where} />}
      </div>
    </li>
  );
}
