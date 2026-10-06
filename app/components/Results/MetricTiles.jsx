import { METRICS, rate } from '@/lib/config';
import { formatDate, formatScore, formatValue } from '@/lib/format';
import ScoreChip from '../ScoreChip';
import Delta from './Delta';

const CORE_VITALS = ['lcp', 'fcp', 'tbt', 'cls'];
const RATING_TEXT = { good: 'good', ok: 'needs improvement', poor: 'poor' };

function MetricTile({ metric, value, delta }) {
  const rating = CORE_VITALS.includes(metric.key) ? rate(metric.key, value) : 'none';
  const format = (amount) => formatValue(metric.fmt, amount);
  return (
    <div className={`tile r-${rating}`}>
      <div className="t-label" title={metric.label}>{metric.label}</div>
      <div className="t-val">
        {format(value)}
        {rating !== 'none' && <span className="sr-only"> ({RATING_TEXT[rating]})</span>}
      </div>
      <div className="t-foot">
        <Delta delta={delta} format={format} />
        {delta && <span className="t-prev">was {format(delta.previous)}</span>}
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
    <div className="hero">
      <ScoreChip score={test.score} caption={caption} />
      <div>
        <div className="tiles">
          {METRICS.map((metric) => (
            <MetricTile key={metric.key} metric={metric} value={test[metric.key]} delta={comparison?.deltas[metric.key]} />
          ))}
        </div>
        {comparison && <p className="note hero-note">Compared with the test from {formatDate(comparison.previousDate)}.</p>}
      </div>
    </div>
  );
}
