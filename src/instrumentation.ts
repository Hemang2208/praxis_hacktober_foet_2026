/**
 * Next.js Instrumentation File
 * This file is loaded once when the server starts and can be used to set up
 * global polyfills and configurations.
 */

export async function register() {
  // Only run on server-side
  if (typeof window === 'undefined') {
    // Create a proper Storage-compatible localStorage polyfill for SSR
    class LocalStorageMock implements Storage {
      private data: Record<string, string> = {};
      
      get length(): number {
        return Object.keys(this.data).length;
      }
      
      clear(): void {
        this.data = {};
      }
      
      getItem(key: string): string | null {
        return this.data[key] ?? null;
      }
      
      key(index: number): string | null {
        const keys = Object.keys(this.data);
        return keys[index] ?? null;
      }
      
      removeItem(key: string): void {
        delete this.data[key];
      }
      
      setItem(key: string, value: string): void {
        this.data[key] = value;
      }
    }

    // Force override any existing localStorage to ensure proper methods
    Object.defineProperty(global, 'localStorage', {
      value: new LocalStorageMock(),
      writable: true,
      configurable: true,
      enumerable: true,
    });
    
    console.log('[Instrumentation] localStorage polyfill installed');

    // Initialize OpenTelemetry tracing only on Node runtime during server startup (not during static build)
    if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
      try {
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

        const traceExporter = new OTLPTraceExporter({
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        });

        const sdk = new NodeSDK({
          traceExporter,
          instrumentations: [getNodeAutoInstrumentations()],
        });

        sdk.start();
        console.log('[Instrumentation] Tracing initialized');
      } catch (err) {
        console.warn('[Instrumentation] Failed to initialize tracing:', err);
      }
    }
  }
}

