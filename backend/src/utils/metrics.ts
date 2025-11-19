export class MetricsWrapper {
  private metrics: any;

  constructor(metrics: any) {
    this.metrics = metrics;
  }

  record(operation: string, table: string, duration: number): void {
    if (this.metrics && this.metrics.record) {
      this.metrics.record(operation, table, duration);
    }
  }
}

export function createMetricsWrapper(metrics: any): MetricsWrapper {
  return new MetricsWrapper(metrics);
}