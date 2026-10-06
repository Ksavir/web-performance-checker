import type { Comparison, Delta, MetricKey } from './types.ts';

// Dirección "mejor" y tolerancia para considerar que una métrica no cambió.
const RULES: Record<MetricKey, { better: 'higher' | 'lower'; tol: (p: number) => number }> = {
  score: { better: 'higher', tol: () => 1 },
  lcp: { better: 'lower', tol: (p) => p * 0.05 },
  fcp: { better: 'lower', tol: (p) => p * 0.05 },
  tbt: { better: 'lower', tol: (p) => Math.max(p * 0.05, 10) },
  cls: { better: 'lower', tol: () => 0.01 },
  pageSize: { better: 'lower', tol: (p) => p * 0.02 },
  requestCount: { better: 'lower', tol: () => 0 },
};

type Comparable = Partial<Record<MetricKey, number | null>> & { id?: number; createdAt?: string };

/** Compara el resultado actual contra el anterior. Devuelve null si no hay anterior. */
export function compare(current: Comparable, previous: (Comparable & { id: number; createdAt: string }) | null): Comparison | null {
  if (!previous) return null;
  const deltas: Comparison['deltas'] = {};
  for (const [key, rule] of Object.entries(RULES) as [MetricKey, (typeof RULES)[MetricKey]][]) {
    const cur = current[key];
    const prev = previous[key];
    if (cur == null || prev == null) continue;
    const diff = cur - prev;
    let status: Delta['status'] = 'same';
    if (Math.abs(diff) > rule.tol(prev)) {
      const improved = rule.better === 'higher' ? diff > 0 : diff < 0;
      status = improved ? 'better' : 'worse';
    }
    deltas[key] = { previous: prev, current: cur, diff, status };
  }
  return { previousId: previous.id, previousDate: previous.createdAt, deltas };
}
