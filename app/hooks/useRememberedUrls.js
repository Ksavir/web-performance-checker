import { useCallback, useEffect, useState } from 'react';
import { readRememberedUrls, saveRememberedUrls } from '@/lib/storage';

/** Recuerda en el navegador la última URL usada para cada tipo de página. */
export function useRememberedUrls() {
  const [urls, setUrls] = useState({});

  // Se lee tras montar: localStorage no existe durante el render en el servidor.
  useEffect(() => { setUrls(readRememberedUrls()); }, []);

  const rememberUrl = useCallback((pageType, url) => {
    const next = { ...urls, [pageType]: url };
    setUrls(next);
    saveRememberedUrls(next);
  }, [urls]);

  return { urls, rememberUrl };
}
