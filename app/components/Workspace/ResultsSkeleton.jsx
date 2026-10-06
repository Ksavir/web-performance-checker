/** Marcador mientras se descarga el código del panel de resultados. */
export default function ResultsSkeleton() {
  return (
    <section className="panel skeleton" aria-busy="true" aria-label="Loading results">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line" />
      <div className="skeleton-grid">
        <div className="skeleton-block" />
        <div className="skeleton-block" />
        <div className="skeleton-block" />
      </div>
    </section>
  );
}
