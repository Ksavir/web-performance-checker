import Diagnosis from './Diagnosis';
import FindingsSections from './FindingsSections';
import MetricTiles from './MetricTiles';

/** Resultado completo de un dispositivo: métricas, avisos, diagnóstico y hallazgos. */
export default function DeviceResult({ test }) {
  return (
    <>
      <MetricTiles test={test} />
      {test.warnings.length > 0 && (
        <div className="warn" role="note"><strong>Check these before trusting the numbers</strong>
          <ul>{test.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}
      {test.findings.diagnosis && <Diagnosis diagnosis={test.findings.diagnosis} />}
      <FindingsSections findings={test.findings} />
    </>
  );
}
