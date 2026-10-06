/** Cambio frente a la prueba anterior. `format` convierte el valor absoluto del cambio en texto. */
export default function Delta({ delta, format }) {
  if (!delta) return <span className="d-same">–</span>;
  if (delta.status === 'same') return <span className="d-same">no change</span>;
  const improved = delta.status === 'better';
  const sign = delta.diff > 0 ? '+' : '−';
  return (
    <span className={improved ? 'd-better' : 'd-worse'}>
      {improved ? '▲' : '▼'} {sign}{format(Math.abs(delta.diff))}
    </span>
  );
}
