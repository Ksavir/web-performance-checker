import Badge from '../ui/Badge';

/** Resumen de una sección de hallazgos; sin valor, indica que no se encontró nada. */
export default function FindingBadge({ value }) {
  return value ? <Badge>{value}</Badge> : <Badge tone="muted">None</Badge>;
}
