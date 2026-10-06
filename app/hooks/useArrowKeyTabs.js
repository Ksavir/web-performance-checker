import { useCallback } from 'react';

const STEPS = { ArrowLeft: -1, ArrowRight: 1 };

/**
 * Navegación con teclado en un tablist (patrón ARIA de pestañas): las flechas
 * seleccionan la pestaña anterior o siguiente (de forma circular) y Home/End la primera o la última.
 */
export function useArrowKeyTabs(onChange) {
  return useCallback((event) => {
    const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(event.target);
    if (current === -1) return;
    let next;
    if (event.key in STEPS) next = (current + STEPS[event.key] + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].dataset.value);
    tabs[next].focus();
  }, [onChange]);
}
