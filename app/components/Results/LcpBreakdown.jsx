import { LCP_PHASES } from '@/lib/config';
import { formatMs } from '@/lib/format';
import CopyButton from '../ui/CopyButton';

function PhaseList({ phases, total }) {
  const share = (duration) => Math.round((duration / Math.max(total, 1)) * 100);
  const dominant = phases.filter((phase) => phase.duration > 0).reduce((max, phase) => (phase.duration > (max?.duration ?? -1) ? phase : max), null);
  return (
    <>
      <ul className="phase-legend">
        {phases.map((phase) => (
          <li key={phase.id}>
            <span className="pl-label">{phase.label}</span>
            <span className="pl-val">{share(phase.duration)}%</span>
            <span className="pl-label">{formatMs(phase.duration)}</span>
          </li>
        ))}
      </ul>
      {dominant && LCP_PHASES[dominant.id] && (
        <div className="tip"><strong>Biggest share: {dominant.label} ({share(dominant.duration)}%).</strong> {LCP_PHASES[dominant.id].tip}</div>
      )}
    </>
  );
}

function LcpElement({ element }) {
  return (
    <div className="lcp-el">
      <h4 className="mini-title">Where to find it</h4>
      <div className="lcp-el-head">
        <span>LCP element{element.label ? <>: <strong>{element.label}</strong></> : null}</span>
      </div>
      {element.selector && (
        <div className="url-wrap"><code>{element.selector}</code><CopyButton text={element.selector} label="selector" /></div>
      )}
      {element.snippet && <pre className="snippet">{element.snippet}</pre>}
    </div>
  );
}

export default function LcpBreakdown({ lcp }) {
  const total = lcp.phases.reduce((sum, phase) => sum + phase.duration, 0);
  const note = total > 0
    ? `Share of each phase in the real, unthrottled load (${formatMs(total)}). The LCP tile above is simulated on a throttled connection, so compare shares, not times. Fix the biggest share first.`
    : 'Lighthouse could not split the LCP into phases.';
  return (
    <>
      <h3>What delays the Largest Contentful Paint</h3>
      <p className="note">{note}</p>
      {total > 0 && <PhaseList phases={lcp.phases} total={total} />}
      {lcp.element && <LcpElement element={lcp.element} />}
    </>
  );
}
