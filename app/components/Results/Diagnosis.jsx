import { formatMs, shortUrl } from '@/lib/format';
import Accordion from '../ui/Accordion';
import DataTable from './DataTable';
import FindingBadge from './FindingBadge';
import { MAIN_THREAD_COLUMNS, RENDER_BLOCKING_COLUMNS } from './findingColumns';
import LcpBreakdown from './LcpBreakdown';
import Opportunities from './Opportunities';

const pluralTasks = (count) => `${count} long ${count === 1 ? 'task' : 'tasks'}`;

function RenderBlocking({ requests }) {
  const blockedMs = requests.reduce((sum, request) => sum + request.ms, 0);
  return (
    <Accordion>
      <Accordion.Summary title="Render-blocking requests" badge={<FindingBadge value={`${requests.length} · ${formatMs(blockedMs)}`} />} />
      <Accordion.Body note="CSS and JS the browser must download before the first paint. Defer or async scripts, and inline only the critical CSS.">
        <DataTable rows={requests} columns={RENDER_BLOCKING_COLUMNS} empty="" />
      </Accordion.Body>
    </Accordion>
  );
}

function MainThread({ longTasks, scripts }) {
  const { count, totalMs, longest } = longTasks;
  const note = count && longest
    ? `${pluralTasks(count)} (${formatMs(totalMs)} in total) block clicks and taps and raise TBT. Longest: ${formatMs(longest.duration)} from ${shortUrl(longest.url)}.`
    : 'No long tasks: the main thread stayed responsive.';
  return (
    <Accordion>
      <Accordion.Summary title="Main-thread work" badge={<FindingBadge value={count ? pluralTasks(count) : scripts.length} />} />
      <Accordion.Body note={note}>
        <DataTable rows={scripts} columns={MAIN_THREAD_COLUMNS} empty="No script execution was attributed to specific files." />
      </Accordion.Body>
    </Accordion>
  );
}

/** El "por qué" de la prueba: fases del LCP, oportunidades, bloqueos de render y hilo principal. */
export default function Diagnosis({ diagnosis }) {
  return (
    <div className="section">
      {diagnosis.lcp && <LcpBreakdown lcp={diagnosis.lcp} />}
      <Opportunities items={diagnosis.opportunities} />
      {diagnosis.renderBlocking.length > 0 && <RenderBlocking requests={diagnosis.renderBlocking} />}
      <MainThread longTasks={diagnosis.longTasks} scripts={diagnosis.mainThread} />
    </div>
  );
}
