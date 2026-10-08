/** Cambio frente a la prueba anterior. `format` convierte el valor absoluto del cambio en texto. */
export default function Delta({ delta, format }) {
  if (!delta) return <span className="text-muted">–</span>;
  if (delta.status === 'same') return <span className="text-muted">no change</span>;
  const improved = delta.status === 'better';
  const sign = delta.diff > 0 ? '+' : '−';
  return (
    <span className={improved ? 'font-semibold text-good' : 'font-semibold text-poor'}>
      {improved ? '▲' : '▼'} {sign}{format(Math.abs(delta.diff))}
    </span>
  );
}
