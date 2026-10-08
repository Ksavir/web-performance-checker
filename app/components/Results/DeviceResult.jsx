import { resolveNetwork } from '@/lib/config';
import Diagnosis from './Diagnosis';
import FindingsSections from './FindingsSections';
import MetricTiles from './MetricTiles';
import { WARN } from '../ui/styles';

/** Resultado completo de un dispositivo: métricas, avisos, diagnóstico y hallazgos. */
export default function DeviceResult({ test }) {
  return (
    <>
      <MetricTiles test={test} />
      {test.warnings.length > 0 && (
        <div className={`${WARN} mx-6 mb-5`} role="note"><strong>Check these before trusting the numbers</strong>
          <ul>{test.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}
      {test.findings.diagnosis && <Diagnosis diagnosis={test.findings.diagnosis} network={resolveNetwork(test)} />}
      <FindingsSections findings={test.findings} />
    </>
  );
}
