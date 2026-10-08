import { rate } from '@/lib/config';
import { RATING } from './ui/styles';

/** Puntaje como anillo de progreso, coloreado según la calificación. */
export default function ScoreChip({ score, caption }) {
  const r = rate('score', score);
  return (
    <div className={`grid justify-items-center gap-2 ${RATING[r]}`}>
      <svg className="size-[170px]" viewBox="0 0 160 160" role="img" aria-label={`Performance score ${score} out of 100`}>
        <circle cx="80" cy="80" r="66" fill="none" stroke="var(--color-line)" strokeWidth="9" />
        <circle cx="80" cy="80" r="66" fill="none" stroke="var(--c)" strokeWidth="9" strokeLinecap="round"
          pathLength="100" strokeDasharray={`${Math.max(score, 1)} 100`} transform="rotate(-90 80 80)" />
        <text x="80" y="82" textAnchor="middle" fontSize="44" fontWeight="700" fill="var(--color-ink)">{score}</text>
        <text x="80" y="104" textAnchor="middle" fontSize="12" fill="var(--color-muted)">out of 100</text>
      </svg>
      <div className="text-center text-[13px] text-muted">{caption}</div>
    </div>
  );
}
