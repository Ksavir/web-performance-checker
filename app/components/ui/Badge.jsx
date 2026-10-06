import { cn } from '@/lib/cn';

/** Etiqueta redonda para cifras cortas ("−350 ms FCP", "178 KB"). */
export default function Badge({ tone = 'accent', children }) {
  return <span className={cn('badge', tone === 'muted' && 'badge-muted')}>{children}</span>;
}
