import { useState } from 'react';
import Icon from '@/app/components/ui/Icon';

/** Miniatura de la imagen; abre el original en otra pestaña. Si el sitio no permite cargarla, muestra un ícono. */
export default function ImageThumb({ url }) {
  const [failed, setFailed] = useState(false);
  return (
    <a className="grid h-12 w-16 flex-none place-items-center overflow-hidden rounded-xs border border-line bg-sunken text-faint transition-colors hover:border-accent" href={url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
      {failed
        ? <Icon name="image" size={18} />
        : <img className="block size-full object-cover" src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    </a>
  );
}
