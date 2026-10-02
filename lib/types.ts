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

export interface Findings {
  slowApis: Pick<Request, 'url' | 'duration' | 'status' | 'size' | 'type'>[];
  bigImages: Pick<Request, 'url' | 'size' | 'mime'>[];
  bigScripts: Pick<Request, 'url' | 'size'>[];
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
