import { useState } from 'react';

const FALLBACK_FILE_NAME = 'report.pdf';

function downloadBlob(blob, fileName) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Pide el PDF del lote al servidor (el historial vive en el navegador, así que se envían los resultados) y lo descarga. */
export function useExportPdf(results) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const exportPdf = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fileName = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? FALLBACK_FILE_NAME;
      downloadBlob(await response.blob(), fileName);
    } catch {
      setError('The PDF could not be created. Try again.');
    }
    setBusy(false);
  };

  return { busy, error, exportPdf };
}
