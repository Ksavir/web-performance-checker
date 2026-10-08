import { SKELETON } from '../ui/styles';

/** Marcador dentro del panel mientras se descarga la pestaña Summarize. */
export default function SummarySkeleton() {
  return (
    <div className="grid gap-3.5 p-6" aria-busy="true" aria-label="Loading summary">
      <div className={`${SKELETON} h-5 w-2/5`} />
      <div className={`${SKELETON} h-3.5 w-3/5`} />
      <div className={`${SKELETON} h-[72px]`} />
    </div>
  );
}
