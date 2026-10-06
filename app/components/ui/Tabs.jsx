import { createContext, useContext, useId, useMemo } from 'react';
import { useArrowKeyTabs } from '@/app/hooks/useArrowKeyTabs';

// Cada variante es solo un juego de clases de globals.css; el comportamiento y la accesibilidad son los mismos.
const VARIANTS = {
  browser: { list: 'view-tabs', tab: 'view-tab', count: 'view-count' },
  underline: { list: 'tabs', tab: 'tab', count: 'view-count' },
  compact: { list: 'hist-tabs', tab: 'hist-tab', count: 'hist-count' },
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
    <button type="button" role="tab" id={tabId(baseId, value)} className={classes.tab} data-value={value}
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
