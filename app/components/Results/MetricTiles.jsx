import { METRICS, rate } from '@/lib/config';
import { formatDate, formatScore, formatValue } from '@/lib/format';
import ScoreChip from '../ScoreChip';
import { RATING } from '../ui/styles';
import Delta from './Delta';

const CORE_VITALS = ['lcp', 'fcp', 'tbt', 'cls'];
const VALUE_COLOR = { good: 'text-vital-good', ok: 'text-vital-ok', poor: 'text-vital-poor', none: '' };
const RATING_TEXT = { good: 'good', ok: 'needs improvement', poor: 'poor' };

function MetricTile({ metric, value, delta }) {
  const rating = CORE_VITALS.includes(metric.key) ? rate(metric.key, value) : 'none';
  const format = (amount) => formatValue(metric.fmt, amount);
  return (
    <div className={`relative rounded-sm border border-line bg-sunken px-3.5 py-3 before:absolute before:top-0 before:left-3.5 before:h-[3px] before:w-[22px] before:rounded-b-[3px] before:bg-(color:--c) before:content-[''] ${RATING[rating]}`}>
      <div className="text-[12.5px] font-medium text-muted" title={metric.label}>{metric.label}</div>
      <div className={`text-[22px] leading-[1.25] font-bold tracking-[-0.01em] ${VALUE_COLOR[rating]}`}>
        {format(value)}
        {rating !== 'none' && <span className="sr-only"> ({RATING_TEXT[rating]})</span>}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5 text-[12.5px]">
        <Delta delta={delta} format={format} />
        {delta && <span className="text-faint">was {format(delta.previous)}</span>}
      </div>
    </div>
  );
}

/** Score y métricas principales de la prueba, con el cambio frente a la anterior. */
export default function MetricTiles({ test }) {
  const { comparison } = test;
  const caption = comparison
    ? <>vs previous: <Delta delta={comparison.deltas.score} format={formatScore} /></>
    : 'First test for this page';
  return (
    <div className="grid grid-cols-1 items-center gap-6 p-6 min-[760px]:grid-cols-[190px_1fr]">
      <ScoreChip score={test.score} caption={caption} />
      <div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
          {METRICS.map((metric) => (
            <MetricTile key={metric.key} metric={metric} value={test[metric.key]} delta={comparison?.deltas[metric.key]} />
          ))}
        </div>
        {comparison && <p className="mt-2.5 mb-0">Compared with the test from {formatDate(comparison.previousDate)}.</p>}
      </div>
    </div>
  );
}
