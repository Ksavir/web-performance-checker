import { rate } from '@/lib/config';

/** Puntaje como ficha de casino: borde con marcas y arco de progreso. */
export default function ScoreChip({ score, caption }) {
  const r = rate('score', score);
  return (
    <div className={`chip r-${r}`}>
      <svg viewBox="0 0 150 150" role="img" aria-label={`Performance score ${score} out of 100`}>
        <circle cx="75" cy="75" r="68" fill="var(--c)" />
        <circle cx="75" cy="75" r="60" fill="none" stroke="#fff" strokeWidth="9" pathLength="96" strokeDasharray="3 3" />
        <circle cx="75" cy="75" r="52" fill="#fff" />
        <circle cx="75" cy="75" r="43" fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle cx="75" cy="75" r="43" fill="none" stroke="var(--c)" strokeWidth="8" strokeLinecap="round"
          pathLength="100" strokeDasharray={`${Math.max(score, 1)} 100`} transform="rotate(-90 75 75)" />
        <text x="75" y="84" textAnchor="middle" fontSize="34" fontWeight="700" fill="#12211b">{score}</text>
      </svg>
      <div className="cap">{caption}</div>
    </div>
  );
}
