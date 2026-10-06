/** Marcador dentro del panel mientras se descarga la pestaña Summarize. */
export default function SummarySkeleton() {
  return (
    <div className="summary skeleton" aria-busy="true" aria-label="Loading summary">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line" />
      <div className="skeleton-block" />
    </div>
  );
}
