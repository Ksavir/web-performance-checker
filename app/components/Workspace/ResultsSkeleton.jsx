import { PANEL, SKELETON } from '../ui/styles';

/** Marcador mientras se descarga el código del panel de resultados. */
export default function ResultsSkeleton() {
  return (
    <section className={`${PANEL} grid gap-3.5 p-6`} aria-busy="true" aria-label="Loading results">
      <div className={`${SKELETON} h-5 w-2/5`} />
      <div className={`${SKELETON} h-3.5 w-3/5`} />
      <div className="grid grid-cols-3 gap-2.5">
        <div className={`${SKELETON} h-[72px]`} />
        <div className={`${SKELETON} h-[72px]`} />
        <div className={`${SKELETON} h-[72px]`} />
      </div>
    </section>
  );
}
