import { createContext, useContext } from 'react';
import { NOTE } from './styles';

// "section": bloque de hallazgos con título de sección. "card": tarjeta más compacta dentro de una lista.
const VARIANTS = {
  section: {
    root: 'group/acc mt-3 rounded-sm border border-line bg-panel first:mt-5',
    summary: 'gap-2.5 px-4 py-3 group-open/acc:rounded-b-none',
    title: 'm-0 flex-1 text-[15px] font-bold',
    TitleTag: 'h3',
    badges: 'flex',
    body: 'pr-4 pb-3 pl-[34px]',
    note: NOTE,
  },
  card: {
    root: 'group/acc rounded-sm border border-line bg-panel',
    summary: 'flex-wrap gap-x-3 gap-y-2 px-3.5 py-2.5',
    title: 'min-w-40 flex-1 text-sm font-semibold',
    TitleTag: 'span',
    badges: 'flex flex-wrap gap-1.5',
    body: 'pr-3.5 pl-8',
    note: 'm-0 pb-2 text-[13.5px] text-muted',
  },
};

const AccordionContext = createContext(VARIANTS.section);

/**
 * Bloque plegable (<details>): el resumen se ve siempre y el cuerpo al abrirlo.
 *
 *   <Accordion>
 *     <Accordion.Summary title="Oversized images" badge={<Badge>2 · 500 KB</Badge>} />
 *     <Accordion.Body note="Images above 200 KB transferred.">…</Accordion.Body>
 *   </Accordion>
 */
export default function Accordion({ variant = 'section', children }) {
  const classes = VARIANTS[variant];
  return (
    <AccordionContext.Provider value={classes}>
      <details className={classes.root}>{children}</details>
    </AccordionContext.Provider>
  );
}

function AccordionSummary({ title, badge }) {
  const { summary, title: titleClass, TitleTag, badges } = useContext(AccordionContext);
  return (
    <summary className={`flex cursor-pointer list-none items-center rounded-sm before:font-bold before:text-faint before:content-['›'] hover:bg-sunken motion-safe:before:transition-transform group-open/acc:before:rotate-90 [&::-webkit-details-marker]:hidden ${summary}`}>
      <TitleTag className={titleClass}>{title}</TitleTag>
      {badge && <span className={badges}>{badge}</span>}
    </summary>
  );
}

function AccordionBody({ note, children }) {
  const { body, note: noteClass } = useContext(AccordionContext);
  return (
    <div className={body}>
      {note && <p className={noteClass}>{note}</p>}
      {children}
    </div>
  );
}

Accordion.Summary = AccordionSummary;
Accordion.Body = AccordionBody;
