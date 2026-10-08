// Next ejecuta register() una vez al arrancar el servidor. El scheduler necesita Node (disco y Chrome), no el runtime edge.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startScheduler } = await import('./lib/schedulerRuntime.ts');
  startScheduler();
}
