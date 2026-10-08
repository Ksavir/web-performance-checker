import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { getDeviceLabel } from '@/lib/config';
import { summarize } from '@/lib/summarize';
import Icon from '../ui/Icon';
import { PANEL } from '../ui/styles';
import Tabs from '../ui/Tabs';
import DeviceResult from './DeviceResult';
import ResultsHeader from './ResultsHeader';
import SummarySkeleton from '../Summary/SummarySkeleton';

// La pestaña Summarize no va en la carga inicial. Su propio `loading` evita que, mientras se descarga,
// se oculte todo el panel de resultados (sin él, la carga sube hasta el límite de Suspense de Results).
const loadSummary = () => import('../Summary/Summary');
const Summary = dynamic(loadSummary, { loading: () => <SummarySkeleton /> });

export default function Results({ batch }) {
  const { results } = batch; // getBatch ya los devuelve con mobile primero
  const [view, setView] = useState('result');
  const [device, setDevice] = useState(results[0].device);
  const current = results.find((result) => result.device === device) ?? results[0];
  const summary = useMemo(() => summarize(current), [current]);
  // Se precarga en cuanto hay resultados, para que la pestaña abra al instante.
  useEffect(() => { loadSummary(); }, []);
  const content = view === 'result' ? <DeviceResult key={current.id} test={current} /> : <Summary key={current.id} summary={summary} />;

  return (
    <section className={PANEL} aria-label="Test results">
      <Tabs value={view} onChange={setView} variant="browser">
        <Tabs.List label="Result view">
          <Tabs.Tab value="result" icon={<Icon name="chart" />}>Test result</Tabs.Tab>
          <Tabs.Tab value="summary" icon={<Icon name="list" />} count={summary.actions.length} countTitle={`${summary.actions.length} suggestions`}>
            Summarize
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel>
          <ResultsHeader results={results} />
          {results.length > 1 ? (
            <Tabs value={device} onChange={setDevice}>
              <Tabs.List label="Device">
                {results.map((result) => (
                  <Tabs.Tab key={result.device} value={result.device}>{getDeviceLabel(result.device)} · {result.score}</Tabs.Tab>
                ))}
              </Tabs.List>
              <Tabs.Panel>{content}</Tabs.Panel>
            </Tabs>
          ) : content}
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
