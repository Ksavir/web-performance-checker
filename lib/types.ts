export type Device = 'mobile' | 'desktop';
export type PageType = 'homepage' | 'lobby' | 'promotions' | 'login';
export type Rating = 'good' | 'ok' | 'poor' | 'none';
export type MetricKey = 'score' | 'lcp' | 'fcp' | 'tbt' | 'cls' | 'pageSize' | 'requestCount';
export type ValueFormat = 'ms' | 'cls' | 'bytes' | 'int';

/** Subconjunto del informe de Lighthouse (LHR) que usa la app. */
export interface Lhr {
  runtimeError?: { message?: string; code?: string };
  runWarnings?: string[];
  finalDisplayedUrl?: string;
  categories?: { performance?: { score: number | null } };
  audits?: Record<string, any>;
}

export interface Request {
  url: string;
  type: string;
  mime: string;
  status?: number;
  duration: number;
  transfer: number;
  resource: number;
  size: number;
}

export interface LcpPhase {
  id: string;
  label: string;
  duration: number;
}

export interface Opportunity {
  id: string;
  title: string;
  savingsBytes?: number;
  savingsMs?: number;
  /** Métrica en la que Lighthouse estima el ahorro de tiempo (LCP, FCP, TBT...). */
  metric?: string;
  items: { url: string; wasted?: number; wastedMs?: number; detail?: string }[];
}

/** Por qué la página es lenta (pruebas anteriores a esta versión no lo tienen). */
export interface Diagnosis {
  lcp: {
    element: { label: string; selector: string; snippet: string } | null;
    phases: LcpPhase[];
  } | null;
  renderBlocking: { url: string; size: number; ms: number }[];
  mainThread: { url: string; total: number; scripting: number; parse: number }[];
  longTasks: { count: number; totalMs: number; longest: { url: string; duration: number } | null };
  opportunities: Opportunity[];
}

export interface Findings {
  slowApis: Pick<Request, 'url' | 'duration' | 'status' | 'size' | 'type'>[];
  /** hint: motivo que da Lighthouse para esa imagen (tamaño o formato). */
  bigImages: (Pick<Request, 'url' | 'size' | 'mime'> & { hint?: string; wasted?: number })[];
  /** unused: bytes del script que no se ejecutan al cargar. */
  bigScripts: (Pick<Request, 'url' | 'size'> & { unused?: number })[];
  diagnosis?: Diagnosis;
  savings: {
    unusedJs?: number;
    unminifiedJs?: number;
    oversizedImages?: number;
    modernImageFormats?: number;
  };
}

export interface TestResult {
  score: number;
  lcp: number | null;
  fcp: number | null;
  tbt: number | null;
  cls: number | null;
  pageSize: number;
  requestCount: number;
  findings: Findings;
  warnings: string[];
}

export interface TestRow extends TestResult {
  id: number;
  batchId: string;
  url: string;
  pageType: PageType;
  device: Device;
  createdAt: string;
  runs: number;
}

export interface Delta {
  previous: number;
  current: number;
  diff: number;
  status: 'better' | 'worse' | 'same';
}

export interface Comparison {
  previousId: number;
  previousDate: string;
  deltas: Partial<Record<MetricKey, Delta>>;
}

export interface Job {
  id: string;
  batchId: string;
  url: string;
  pageType: PageType;
  devices: Device[];
  runs: number;
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled';
  progress: { done: number; total: number; label: string };
  errors: { device: Device; message: string }[];
  results: { device: Device; runs: number; result: TestResult }[];
  createdAt: number;
}

export type Priority = 'high' | 'medium' | 'low';

export interface SummaryVital {
  key: 'lcp' | 'fcp' | 'tbt' | 'cls';
  label: string;
  value: string;
  target: string;
  rating: Rating;
}

export interface SummaryAction {
  id: string;
  title: string;
  /** Evidencia de esta prueba (números concretos). */
  why: string;
  /** Qué hacer para arreglarlo. */
  tip: string;
  priority: Priority;
  savingsMs?: number;
  metric?: string;
  savingsBytes?: number;
  /** Dónde mirar: archivos o elementos concretos. */
  where: { text: string; href?: string; detail?: string }[];
}

/** Resumen de una prueba: veredicto, qué arreglar (priorizado) y qué va bien. */
export interface Summary {
  rating: Rating;
  headline: string;
  detail: string;
  vitals: SummaryVital[];
  caveats: string[];
  changes: { since: string; worse: string[]; better: string[]; singleRun: boolean } | null;
  actions: SummaryAction[];
  working: string[];
}
