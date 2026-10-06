'use client';
import dynamic from 'next/dynamic';
import History from '../History/History';
import TestForm from '../TestForm/TestForm';
import EmptyState from './EmptyState';
import JobErrors from './JobErrors';
import JobProgress from './JobProgress';
import ResultsSkeleton from './ResultsSkeleton';
import { useHistory } from '@/app/hooks/useHistory';
import { useTestJob } from '@/app/hooks/useTestJob';

// Los resultados solo aparecen después de una prueba: su código no va en la carga inicial.
const Results = dynamic(() => import('../Results/Results'), { loading: () => <ResultsSkeleton /> });

/** Parte interactiva de la página: formulario, progreso, resultados e historial. */
export default function Workspace() {
  const history = useHistory();
  const test = useTestJob({ onStart: history.closeBatch, onDone: history.saveResults });
  const { activeBatch } = history;

  return (
    <div className="workspace">
      <div className="side">
        <TestForm disabled={test.running} onSubmit={test.start} />
        <History batches={history.batches} activeId={activeBatch?.batchId} onOpen={history.openBatch} onClear={history.clearHistory} onDelete={history.removeBatch} />
      </div>

      <main className="content">
        {test.error && <div className="error" role="alert">{test.error}</div>}
        {test.running && <JobProgress job={test.job} cancelling={test.cancelling} onCancel={test.cancel} />}
        {!test.running && <JobErrors job={test.job} />}
        {activeBatch && <Results key={activeBatch.batchId} batch={activeBatch} />}
        {!activeBatch && !test.running && <EmptyState title={history.batches.length > 0 ? 'Run a test' : 'Run your first test'} />}
      </main>
    </div>
  );
}
