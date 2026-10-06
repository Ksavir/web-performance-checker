import { createContext, useContext } from 'react';

// "section": bloque de hallazgos con título de sección. "card": tarjeta más compacta dentro de una lista.
const VARIANTS = {
  section: { root: 'acc', title: 'acc-title', TitleTag: 'h3', badges: 'acc-badges', body: 'acc-body', note: 'note' },
  card: { root: 'opp', title: 'opp-title', TitleTag: 'span', badges: 'opp-impact', body: 'opp-body', note: 'opp-tip' },
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
  const { title: titleClass, TitleTag, badges } = useContext(AccordionContext);
  return (
    <summary>
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
