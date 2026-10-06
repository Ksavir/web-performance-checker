/** Dispositivos que no se pudieron probar en la última prueba. */
export default function JobErrors({ job }) {
  if (!job?.errors?.length) return null;
  return (
    <div className="error" role="alert">
      {job.status === 'error' ? 'The test could not be completed.' : 'Some devices could not be tested.'}
      <ul>{job.errors.map((error) => <li key={error.device}><strong>{error.device}:</strong> {error.message}</li>)}</ul>
    </div>
  );
}
