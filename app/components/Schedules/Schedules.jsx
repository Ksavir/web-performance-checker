import { ERROR, HINT, NONE, PANEL } from '../ui/styles';
import ScheduleForm from './ScheduleForm';
import ScheduleItem from './ScheduleItem';

/** Pruebas que corren solas, guardadas en el servidor. `draft` es la configuración del formulario que se está programando. */
export default function Schedules({ schedules, error, draft, onCreate, onCancelDraft, onSetEnabled, onRunNow, onDelete, onOpenRun, loadRuns }) {
  return (
    <aside className={`${PANEL} p-4`} aria-label="Scheduled tests">
      <h2 className="m-0 mb-1 text-[15px] font-bold">Scheduled tests</h2>
      <p className={`${HINT} mb-2.5`}>They run only while this app is open. Missed runs happen once when it starts again.</p>
      {draft && <ScheduleForm draft={draft} onCreate={onCreate} onCancel={onCancelDraft} />}
      {error && <div className={`${ERROR} mb-2.5 text-[13px]`} role="alert">{error}</div>}
      {schedules.length === 0 ? <div className={NONE}>Use “Schedule this test…” in the form to add one.</div> : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {schedules.map((schedule) => (
            <ScheduleItem key={schedule.id} schedule={schedule} onSetEnabled={onSetEnabled} onRunNow={onRunNow} onDelete={onDelete} onOpenRun={(run) => onOpenRun(schedule, run)} loadRuns={loadRuns} />
          ))}
        </ul>
      )}
    </aside>
  );
}
