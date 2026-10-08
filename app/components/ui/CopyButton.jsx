import Icon from './Icon';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';

/** Botón para copiar `text`; `label` nombra lo que se copia en el texto accesible ("URL", "selector"). */
export default function CopyButton({ text, label = 'URL' }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button type="button" className="-mt-0.5 grid size-6 flex-none cursor-pointer place-items-center rounded-xs border-0 bg-transparent p-0 text-faint opacity-0 transition-colors group-hover/row:opacity-100 hover:bg-accent-soft hover:text-accent focus-visible:opacity-100 [@media(hover:none)]:opacity-100" onClick={() => copy(text)}
      aria-label={copied ? `${label} copied` : `Copy full ${label}`} title={copied ? 'Copied' : `Copy full ${label}`}>
      <Icon name={copied ? 'check' : 'copy'} size={14} />
    </button>
  );
}
