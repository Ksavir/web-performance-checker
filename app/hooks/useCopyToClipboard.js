import { useCallback, useEffect, useState } from 'react';

const COPIED_FEEDBACK_MS = 1500;

/** Copia texto al portapapeles y marca `copied` durante un momento (el temporizador se limpia al desmontar). */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch { /* sin permiso para el portapapeles: no se muestra la confirmación */ }
  }, []);

  return { copied, copy };
}
