import { useState } from 'react';
import { DEFAULT_NETWORK, DEVICES, NETWORKS, PAGE_TYPES } from '@/lib/config';
import Icon from '../ui/Icon';
import { FIELD, GHOST_BUTTON, HINT, INPUT, LABEL, PANEL, PRIMARY_BUTTON, SELECT } from '../ui/styles';
import { useRememberedUrls } from '@/app/hooks/useRememberedUrls';

// Detalles de presentación de cada dispositivo; la lista de dispositivos sale de lib/config.
const DEVICE_DETAILS = {
  mobile: { note: 'Phone, Tablet', icon: 'mobile' },
  desktop: { note: 'Computer, Laptop', icon: 'desktop' },
};
const DEVICE_ICON_SIZE = 22;
const HIDDEN_INPUT = 'peer pointer-events-none absolute opacity-0';
const FOCUS_RING = 'peer-focus-visible:outline-2 peer-focus-visible:outline-accent';
const ALL_DEVICES_SELECTED = Object.fromEntries(DEVICES.map((device) => [device.id, true]));

function PageTypeField({ value, onChange }) {
  return (
    <fieldset className={FIELD}>
      <legend className={LABEL}>Page type</legend>
      <div className="relative grid grid-cols-2 gap-0.5 rounded-sm border border-line bg-sunken p-[3px]">
        {PAGE_TYPES.map((type) => (
          <div key={type.id} className="contents">
            <input className={HIDDEN_INPUT} type="radio" name="pageType" id={`pt-${type.id}`} checked={value === type.id} onChange={() => onChange(type.id)} />
            <label htmlFor={`pt-${type.id}`} className={`cursor-pointer rounded-xs px-2.5 py-[7px] text-center text-sm transition-colors ${FOCUS_RING} ${value === type.id ? 'bg-panel font-semibold text-accent shadow-chip' : 'font-medium text-muted hover:text-ink'}`}>{type.label}</label>
          </div>
        ))}
      </div>
      <p className={HINT}>Each page type remembers its own URL.</p>
    </fieldset>
  );
}

function DeviceOption({ device, checked, onChange }) {
  return (
    <div className="contents">
      <input className={HIDDEN_INPUT} type="checkbox" id={`dev-${device.id}`} checked={checked} onChange={onChange} />
      <label htmlFor={`dev-${device.id}`}
        className={`relative flex cursor-pointer items-center gap-2.5 rounded-sm border-[1.5px] bg-panel px-3 py-2.5 text-[13.5px] font-normal transition-colors peer-focus-visible:outline-offset-2 ${FOCUS_RING} ${checked ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-faint'}`}>
        <span className={`grid transition-colors ${checked ? 'text-accent' : 'text-faint'}`}><Icon name={DEVICE_DETAILS[device.id].icon} size={DEVICE_ICON_SIZE} /></span>
        <span className="grid min-w-0 leading-[1.25]">
          <strong className={`text-sm ${checked ? 'text-accent' : 'text-muted'}`}>{device.label}</strong>
          <small className="text-xs text-faint">{DEVICE_DETAILS[device.id].note}</small>
        </span>
        <span className={`absolute top-2 right-2 grid size-[18px] place-items-center rounded-full border-[1.5px] transition-colors ${checked ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-panel text-transparent'}`} aria-hidden="true">
          <Icon name="checkBold" size={12} />
        </span>
      </label>
    </div>
  );
}

function DevicesField({ selected, onChange }) {
  return (
    <fieldset className={FIELD}>
      <legend className={LABEL}>Test on</legend>
      <div className="relative grid grid-cols-1 gap-2 min-[421px]:grid-cols-2">
        {DEVICES.map((device) => (
          <DeviceOption key={device.id} device={device} checked={selected[device.id]}
            onChange={(event) => onChange({ ...selected, [device.id]: event.target.checked })} />
        ))}
      </div>
    </fieldset>
  );
}

export default function TestForm({ disabled, onSubmit, onSchedule }) {
  const [pageType, setPageType] = useState(PAGE_TYPES[0].id);
  const [devices, setDevices] = useState(ALL_DEVICES_SELECTED);
  const [runs, setRuns] = useState('1');
  const [network, setNetwork] = useState(DEFAULT_NETWORK);
  const { urls, rememberUrl } = useRememberedUrls();
  const noDevice = !DEVICES.some((device) => devices[device.id]);

  const buildRequest = () => ({
    url: urls[pageType] ?? '',
    pageType,
    devices: DEVICES.map((device) => device.id).filter((id) => devices[id]),
    runs: Number(runs),
    network,
  });

  const submit = (event) => {
    event.preventDefault();
    if (noDevice) return;
    onSubmit(buildRequest());
  };

  return (
    <form className={`${PANEL} grid gap-[18px] p-5`} onSubmit={submit}>
      <h2 className="m-0 text-base font-bold tracking-[-0.01em]">New test</h2>
      <PageTypeField value={pageType} onChange={setPageType} />

      <div className={FIELD}>
        <label className={LABEL} htmlFor="url">Page URL</label>
        <input id="url" className={INPUT} type="text" inputMode="url" autoComplete="off" spellCheck={false}
          placeholder="https://www.example.com/" value={urls[pageType] ?? ''} onChange={(event) => rememberUrl(pageType, event.target.value)} />
      </div>

      <DevicesField selected={devices} onChange={setDevices} />

      <div className={FIELD}>
        <label className={LABEL} htmlFor="network">Network</label>
        <select id="network" className={SELECT} value={network} onChange={(event) => setNetwork(event.target.value)} aria-describedby="network-hint">
          {NETWORKS.map((profile) => <option key={profile.id} value={profile.id}>{profile.label} ({profile.description})</option>)}
        </select>
        <p className={HINT} id="network-hint">Simulated latency and speed (Slow 4G is Lighthouse's mobile default). Only tests on the same network are compared.</p>
      </div>

      <div className={FIELD}>
        <label className={LABEL} htmlFor="runs">Accuracy</label>
        <select id="runs" className={SELECT} value={runs} onChange={(event) => setRuns(event.target.value)}>
          <option value="1">1 run per device (about 1 min)</option>
          <option value="3">3 runs, median (more stable)</option>
        </select>
      </div>

      <button className={PRIMARY_BUTTON} type="submit" disabled={disabled || noDevice}>{disabled ? 'Running…' : 'Run test'}</button>
      <button type="button" className={`${GHOST_BUTTON} px-5 py-2.5`} disabled={noDevice} onClick={() => onSchedule(buildRequest())}>Schedule this test…</button>
      <p className={HINT}>Only test sites you own or have permission to test.</p>
    </form>
  );
}
