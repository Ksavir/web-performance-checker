const TONES = {
  accent: 'bg-accent-soft font-bold text-accent',
  muted: 'bg-sunken font-semibold text-muted',
};

/** Etiqueta redonda para cifras cortas ("−350 ms FCP", "178 KB"). */
export default function Badge({ tone = 'accent', children }) {
  return <span className={`inline-block rounded-full px-[9px] py-px text-[12.5px] whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}
