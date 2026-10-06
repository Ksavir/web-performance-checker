import Icon from './Icon';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';

/** Botón para copiar `text`; `label` nombra lo que se copia en el texto accesible ("URL", "selector"). */
export default function CopyButton({ text, label = 'URL' }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button type="button" className="copy-btn" onClick={() => copy(text)}
      aria-label={copied ? `${label} copied` : `Copy full ${label}`} title={copied ? 'Copied' : `Copy full ${label}`}>
      <Icon name={copied ? 'check' : 'copy'} size={14} />
    </button>
  );
}
