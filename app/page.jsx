import Workspace from './components/Workspace/Workspace';

// Server Component: la cabecera es estática; solo Workspace (formulario, resultados e historial) se hidrata.
export default function Home() {
  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-6 pb-[72px]">
      <header className="mb-6 flex items-center gap-3.5">
        <img className="block size-[38px] flex-none" src="/logo.svg" alt="" width="38" height="38" />
        <div>
          <h1 className="m-0 text-xl leading-[1.2] font-bold tracking-[-0.015em]">Web Performance Check</h1>
          <p className="mt-0.5 mb-0 text-sm text-muted">Test a URL page, compare it with your last test and export a PDF.</p>
        </div>
      </header>
      <Workspace />
    </div>
  );
}
