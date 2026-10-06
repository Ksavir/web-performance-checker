import Workspace from './components/Workspace/Workspace';

// Server Component: la cabecera es estática; solo Workspace (formulario, resultados e historial) se hidrata.
export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <img className="brand-logo" src="/logo.svg" alt="" width="38" height="38" />
        <div>
          <h1>Web Performance Check</h1>
          <p>Test a URL page, compare it with your last test and export a PDF.</p>
        </div>
      </header>
      <Workspace />
    </div>
  );
}
