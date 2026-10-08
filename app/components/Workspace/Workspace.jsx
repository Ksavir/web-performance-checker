'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import History from '../History/History';
import Schedules from '../Schedules/Schedules';
import TestForm from '../TestForm/TestForm';
import EmptyState from './EmptyState';
import JobErrors from './JobErrors';
import JobProgress from './JobProgress';
import ResultsSkeleton from './ResultsSkeleton';
import { useHistory } from '@/app/hooks/useHistory';
import { useSchedules } from '@/app/hooks/useSchedules';
import { useTestJob } from '@/app/hooks/useTestJob';
import { ERROR } from '../ui/styles';

// Los resultados solo aparecen después de una prueba: su código no va en la carga inicial.
const Results = dynamic(() => import('../Results/Results'), { loading: () => <ResultsSkeleton /> });

/** Parte interactiva de la página: formulario, progreso, resultados e historial. */
export default function Workspace() {
  const history = useHistory();
  const schedules = useSchedules();
  const [scheduleDraft, setScheduleDraft] = useState(null);
  // Corrida programada abierta en el panel de resultados (vive en el servidor, no en el historial del navegador).
  const [scheduledBatch, setScheduledBatch] = useState(null);
  const test = useTestJob({ onStart: () => { history.closeBatch(); setScheduledBatch(null); }, onDone: history.saveResults });
  const activeBatch = scheduledBatch ?? history.activeBatch;

  const createSchedule = async (body) => {
    const result = await schedules.create(body);
    if (!result.error) setScheduleDraft(null);
    return result;
  };
  const openHistoryBatch = (batchId) => { setScheduledBatch(null); history.openBatch(batchId); };
  const openScheduledRun = (_schedule, run) => { history.closeBatch(); setScheduledBatch({ batchId: run.id, results: run.results }); };

  return (
    <div className="grid grid-cols-1 items-start gap-5 min-[960px]:grid-cols-[360px_minmax(0,1fr)]">
      <div className="grid min-w-0 content-start gap-4">
        <TestForm disabled={test.running} onSubmit={test.start} onSchedule={setScheduleDraft} />
        <History batches={history.batches} activeId={history.activeBatch?.batchId} onOpen={openHistoryBatch} onClear={history.clearHistory} onDelete={history.removeBatch} />
        <Schedules schedules={schedules.schedules} error={schedules.error} draft={scheduleDraft} onCreate={createSchedule} onCancelDraft={() => setScheduleDraft(null)}
          onSetEnabled={schedules.setEnabled} onRunNow={schedules.runNow} onDelete={schedules.remove} onOpenRun={openScheduledRun} loadRuns={schedules.loadRuns} />
      </div>

      <main className="grid min-w-0 gap-4">
        {test.error && <div className={ERROR} role="alert">{test.error}</div>}
        {test.running && <JobProgress job={test.job} cancelling={test.cancelling} onCancel={test.cancel} />}
        {!test.running && <JobErrors job={test.job} />}
        {activeBatch && <Results key={activeBatch.batchId} batch={activeBatch} />}
        {!activeBatch && !test.running && <EmptyState title={history.batches.length > 0 ? 'Run a test' : 'Run your first test'} />}
      </main>
    </div>
  );
}
