import { useState } from 'react';
import { PAGE_TYPES, getDeviceLabel, getNetworkLabel } from '@/lib/config';
import { shortUrl } from '@/lib/format';
import { ERROR, FIELD, GHOST_BUTTON, HINT, INPUT, LABEL, PRIMARY_BUTTON, SELECT } from '../ui/styles';

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Qué se va a programar, en una línea, para confirmar la configuración del formulario de prueba. */
function describeTest({ url, pageType, devices, runs, network }) {
  const page = PAGE_TYPES.find((type) => type.id === pageType)?.label;
  const runsText = runs > 1 ? ` · median of ${runs} runs` : '';
  return `${page} · ${shortUrl(url)} · ${devices.map(getDeviceLabel).join(' + ')} · ${getNetworkLabel(network)}${runsText}`;
}

/** Elige la frecuencia de la prueba que está en el formulario principal. */
export default function ScheduleForm({ draft, onCreate, onCancel }) {
  const [unit, setUnit] = useState('days');
  const [count, setCount] = useState('1');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = await onCreate({ ...draft, every: { unit, n: Number(count) }, timeOfDay, timezone: browserTimezone() });
    setBusy(false);
    if (result.error) setError(result.error);
  };

  return (
    <form className="mb-3 grid gap-3.5 rounded-sm border border-line-strong bg-sunken p-3.5" onSubmit={submit}>
      <p className="m-0 text-[13px] font-semibold [overflow-wrap:anywhere]">{describeTest(draft)}</p>
      <div className={FIELD}>
        <label className={LABEL} htmlFor="schedule-count">Repeat every</label>
        <div className="grid grid-cols-2 gap-2">
          <input id="schedule-count" className={INPUT} type="number" min="1" max={unit === 'hours' ? 168 : 30} value={count} onChange={(event) => setCount(event.target.value)} />
          <select aria-label="Unit" className={SELECT} value={unit} onChange={(event) => setUnit(event.target.value)}>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </div>
      </div>
      {unit === 'days' && (
        <div className={FIELD}>
          <label className={LABEL} htmlFor="schedule-time">At</label>
          <input id="schedule-time" className={INPUT} type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} />
          <p className={HINT}>Time zone: {browserTimezone()}</p>
        </div>
      )}
      {error && <div className={ERROR} role="alert">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className={`${PRIMARY_BUTTON} px-4 py-2 text-[13.5px]`} disabled={busy}>{busy ? 'Saving…' : 'Create schedule'}</button>
        <button type="button" className={`${GHOST_BUTTON} px-4 py-2 text-[13.5px]`} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
