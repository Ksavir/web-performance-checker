import { Fragment, useState } from 'react';
import { DEVICES, PAGE_TYPES } from '@/lib/config';
import Icon from '../ui/Icon';
import { useRememberedUrls } from '@/app/hooks/useRememberedUrls';

// Detalles de presentación de cada dispositivo; la lista de dispositivos sale de lib/config.
const DEVICE_DETAILS = {
  mobile: { note: 'Phone, Tablet', icon: 'mobile' },
  desktop: { note: 'Computer, Laptop', icon: 'desktop' },
};
const DEVICE_ICON_SIZE = 22;
const ALL_DEVICES_SELECTED = Object.fromEntries(DEVICES.map((device) => [device.id, true]));

function PageTypeField({ value, onChange }) {
  return (
    <fieldset className="field">
      <legend>Page type</legend>
      <div className="seg seg-grid">
        {PAGE_TYPES.map((type) => (
          <Fragment key={type.id}>
            <input type="radio" name="pageType" id={`pt-${type.id}`} checked={value === type.id} onChange={() => onChange(type.id)} />
            <label htmlFor={`pt-${type.id}`}>{type.label}</label>
          </Fragment>
        ))}
      </div>
      <p className="hint">Each page type remembers its own URL.</p>
    </fieldset>
  );
}

function DevicesField({ selected, onChange }) {
  return (
    <fieldset className="field">
      <legend>Test on</legend>
      <div className="devices">
        {DEVICES.map((device) => (
          <Fragment key={device.id}>
            <input type="checkbox" id={`dev-${device.id}`} checked={selected[device.id]} onChange={(event) => onChange({ ...selected, [device.id]: event.target.checked })} />
            <label htmlFor={`dev-${device.id}`} className="device">
              <span className="device-icon"><Icon name={DEVICE_DETAILS[device.id].icon} size={DEVICE_ICON_SIZE} /></span>
              <span className="device-text"><strong>{device.label}</strong><small>{DEVICE_DETAILS[device.id].note}</small></span>
              <span className="device-check" aria-hidden="true"><Icon name="checkBold" size={12} /></span>
            </label>
          </Fragment>
        ))}
      </div>
    </fieldset>
  );
}

export default function TestForm({ disabled, onSubmit }) {
  const [pageType, setPageType] = useState(PAGE_TYPES[0].id);
  const [devices, setDevices] = useState(ALL_DEVICES_SELECTED);
  const [runs, setRuns] = useState('1');
  const { urls, rememberUrl } = useRememberedUrls();
  const noDevice = !DEVICES.some((device) => devices[device.id]);

  const submit = (event) => {
    event.preventDefault();
    if (noDevice) return;
    onSubmit({
      url: urls[pageType] ?? '',
      pageType,
      devices: DEVICES.map((device) => device.id).filter((id) => devices[id]),
      runs: Number(runs),
    });
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>New test</h2>
      <PageTypeField value={pageType} onChange={setPageType} />

      <div className="field">
        <label htmlFor="url">Page URL</label>
        <input id="url" className="url-input" type="text" inputMode="url" autoComplete="off" spellCheck={false}
          placeholder="https://www.example.com/" value={urls[pageType] ?? ''} onChange={(event) => rememberUrl(pageType, event.target.value)} />
      </div>

      <DevicesField selected={devices} onChange={setDevices} />

      <div className="field">
        <label htmlFor="runs">Accuracy</label>
        <select id="runs" className="select" value={runs} onChange={(event) => setRuns(event.target.value)}>
          <option value="1">1 run per device (about 1 min)</option>
          <option value="3">3 runs, median (more stable)</option>
        </select>
      </div>

      <button className="run-btn" type="submit" disabled={disabled || noDevice}>{disabled ? 'Running…' : 'Run test'}</button>
      <p className="hint">Only test sites you own or have permission to test.</p>
    </form>
  );
}
