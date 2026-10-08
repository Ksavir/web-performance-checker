import { createContext, useContext, useId, useMemo } from 'react';
import { useArrowKeyTabs } from '@/app/hooks/useArrowKeyTabs';

// Cada variante es solo un juego de clases; el comportamiento y la accesibilidad son los mismos.
const UNDERLINE_TAB = '-mb-px cursor-pointer border-0 border-b-2 border-transparent bg-transparent font-semibold text-muted hover:text-ink aria-selected:border-accent aria-selected:text-accent';
const COUNT = 'min-w-[18px] rounded-full bg-sunken px-[5px] text-center text-[11.5px] leading-[18px] text-muted group-aria-selected:bg-accent-soft group-aria-selected:text-accent';

// Pestaña activa estilo Chrome: se funde con el panel y sus esquinas inferiores se curvan hacia afuera.
const CURVE = 'aria-selected:before:absolute aria-selected:before:bottom-0 aria-selected:before:size-tab aria-selected:before:content-[\'\'] aria-selected:after:absolute aria-selected:after:bottom-0 aria-selected:after:size-tab aria-selected:after:content-[\'\']';
const CURVE_LEFT = 'aria-selected:before:-left-tab aria-selected:before:bg-[radial-gradient(circle_at_0_0,transparent_9.5px,var(--color-panel)_10px)]';
const CURVE_RIGHT = 'aria-selected:after:-right-tab aria-selected:after:bg-[radial-gradient(circle_at_100%_0,transparent_9.5px,var(--color-panel)_10px)]';
const BROWSER_LIST = 'flex items-end gap-0.5 rounded-t-[13px] border-b border-line bg-bg px-3 pt-2';
const BROWSER_TAB = `relative inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-t-tab border-0 bg-transparent px-4 pt-[9px] pb-2.5 text-sm font-semibold text-muted transition-colors [&_svg]:flex-none [&_svg]:text-faint hover:not-aria-selected:bg-white/60 hover:not-aria-selected:text-ink aria-selected:z-10 aria-selected:-mb-px aria-selected:bg-panel aria-selected:text-ink aria-selected:[&_svg]:text-accent ${CURVE} ${CURVE_LEFT} ${CURVE_RIGHT}`;
const VARIANTS = {
  browser: { list: BROWSER_LIST, tab: BROWSER_TAB, count: COUNT },
  underline: { list: 'flex gap-[22px] border-y border-line px-6', tab: `${UNDERLINE_TAB} px-0.5 py-3`, count: COUNT },
  compact: {
    list: 'mb-2.5 flex justify-between gap-2 overflow-x-auto border-b border-line [scrollbar-width:none]',
    tab: `${UNDERLINE_TAB} inline-flex flex-none items-center gap-[5px] px-px pt-1.5 pb-2 text-[12.5px]`,
    count: `${COUNT} min-w-[17px] px-1`,
  },
};

const TabsContext = createContext(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs.List, Tabs.Tab and Tabs.Panel must be used inside <Tabs>.');
  return context;
}

const tabId = (baseId, value) => `${baseId}-tab-${value}`;
const panelId = (baseId) => `${baseId}-panel`;

/**
 * Pestañas accesibles (role, aria-selected, aria-controls y navegación con flechas).
 * Hay un solo panel por grupo: su contenido depende de la pestaña activa.
 *
 *   <Tabs value={view} onChange={setView} variant="browser">
 *     <Tabs.List label="Result view">
 *       <Tabs.Tab value="result">Test result</Tabs.Tab>
 *     </Tabs.List>
 *     <Tabs.Panel>…</Tabs.Panel>
 *   </Tabs>
 */
export default function Tabs({ value, onChange, variant = 'underline', children }) {
  const baseId = useId();
  const context = useMemo(() => ({ value, onChange, baseId, classes: VARIANTS[variant] }), [value, onChange, baseId, variant]);
  return <TabsContext.Provider value={context}>{children}</TabsContext.Provider>;
}

function TabsList({ label, children }) {
  const { classes, onChange } = useTabs();
  const onKeyDown = useArrowKeyTabs(onChange);
  return (
    <div className={classes.list} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

function Tab({ value, icon, count, countTitle, children }) {
  const { value: activeValue, onChange, baseId, classes } = useTabs();
  const selected = value === activeValue;
  return (
    <button type="button" role="tab" id={tabId(baseId, value)} className={`group ${classes.tab}`} data-value={value}
      aria-selected={selected} aria-controls={panelId(baseId)} tabIndex={selected ? 0 : -1} onClick={() => onChange(value)}>
      {icon}
      {children}
      {count > 0 && <span className={classes.count} title={countTitle}>{count}</span>}
    </button>
  );
}

function TabsPanel({ children }) {
  const { value, baseId } = useTabs();
  return (
    <div id={panelId(baseId)} role="tabpanel" aria-labelledby={tabId(baseId, value)}>
      {children}
    </div>
  );
}

Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panel = TabsPanel;
