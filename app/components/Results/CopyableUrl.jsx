import CopyButton from '@/app/components/ui/CopyButton';
import { shortUrl } from '@/lib/format';

function UrlWithHint({ url, hint, children }) {
  return (
    <>
      <span className="url-wrap">
        {children}
        <CopyButton text={url} />
      </span>
      {hint && <div className="row-hint">{hint}</div>}
    </>
  );
}

/** URL acortada (la completa en el tooltip) con botón para copiarla. */
export function CopyableText({ url, hint }) {
  return (
    <UrlWithHint url={url} hint={hint}>
      <span title={url}>{shortUrl(url)}</span>
    </UrlWithHint>
  );
}

/** Como CopyableText, pero la URL es un enlace que se abre en otra pestaña. */
export function CopyableLink({ url, hint }) {
  return (
    <UrlWithHint url={url} hint={hint}>
      <a className="url-link" href={url} target="_blank" rel="noopener noreferrer" title={`${url} (opens in a new tab)`}>{shortUrl(url)}</a>
    </UrlWithHint>
  );
}
