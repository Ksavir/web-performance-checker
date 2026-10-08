import { LCP_PHASES } from '@/lib/config';
import { formatMs } from '@/lib/format';
import CopyButton from '../ui/CopyButton';
import { CODE, MINI_TITLE, NOTE, SECTION_TITLE, URL_WRAP } from '../ui/styles';

function PhaseList({ phases, total }) {
  const share = (duration) => Math.round((duration / Math.max(total, 1)) * 100);
  const dominant = phases.filter((phase) => phase.duration > 0).reduce((max, phase) => (phase.duration > (max?.duration ?? -1) ? phase : max), null);
  return (
    <>
      <ul className="mt-3 mb-0 flex list-none flex-wrap gap-x-[22px] gap-y-1.5 p-0 text-[13px]">
        {phases.map((phase) => (
          <li key={phase.id} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted">{phase.label}</span>
            <span className="font-bold">{share(phase.duration)}%</span>
            <span className="text-muted">{formatMs(phase.duration)}</span>
          </li>
        ))}
      </ul>
      {dominant && LCP_PHASES[dominant.id] && (
        <div className="mt-3.5 mb-0 rounded-sm bg-accent-soft px-3.5 py-2.5 text-[13.5px]"><strong>Biggest share: {dominant.label} ({share(dominant.duration)}%).</strong> {LCP_PHASES[dominant.id].tip}</div>
      )}
    </>
  );
}

function LcpElement({ element }) {
  return (
    <div className="mt-[18px] grid min-w-0 gap-1.5 text-[13.5px]">
      <h4 className={MINI_TITLE}>Where to find it</h4>
      <div>
        <span>LCP element{element.label ? <>: <strong>{element.label}</strong></> : null}</span>
      </div>
      {element.selector && (
        <div className={URL_WRAP}><code className={CODE}>{element.selector}</code><CopyButton text={element.selector} label="selector" /></div>
      )}
      {element.snippet && <pre className="m-0 rounded-sm border border-line bg-sunken px-3 py-2.5 text-xs whitespace-pre-wrap text-muted [overflow-wrap:anywhere]">{element.snippet}</pre>}
    </div>
  );
}

function describePhases(total, network) {
  if (total <= 0) return 'Lighthouse could not split the LCP into phases.';
  // Con throttling simulado, el LCP del recuadro es una estimación y las fases salen de la carga real.
  if (network === 'none') return `Share of each phase in the load (${formatMs(total)}). Fix the biggest share first.`;
  return `Share of each phase in the real, unthrottled load (${formatMs(total)}). The LCP tile above is simulated on a throttled connection, so compare shares, not times. Fix the biggest share first.`;
}

export default function LcpBreakdown({ lcp, network }) {
  const total = lcp.phases.reduce((sum, phase) => sum + phase.duration, 0);
  const note = describePhases(total, network);
  return (
    <>
      <h3 className={SECTION_TITLE}>What delays the Largest Contentful Paint</h3>
      <p className={NOTE}>{note}</p>
      {total > 0 && <PhaseList phases={lcp.phases} total={total} />}
      {lcp.element && <LcpElement element={lcp.element} />}
    </>
  );
}
