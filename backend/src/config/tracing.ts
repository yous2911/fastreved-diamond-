// Conditional OpenTelemetry import
let openTelemetryApi: any;
let NodeSDK: any;

try {
  openTelemetryApi = require('@opentelemetry/api');
  const { NodeSDK } = require('@opentelemetry/auto-instrumentations-node');
  
  const sdk = new NodeSDK({
    instrumentations: [], // Add instrumentations as needed
  });
  
  sdk.start();
  console.log('OpenTelemetry initialized successfully');
} catch (error) {
  console.warn('OpenTelemetry not installed, tracing disabled:', error);
  
  // Mock OpenTelemetry API
  openTelemetryApi = {
    trace: {
      getTracer: () => ({
        startSpan: (name: string) => ({
          end: () => {},
          setStatus: () => {},
          setAttributes: () => {},
          recordException: () => {},
        }),
      }),
    },
  };
}

export const tracer = openTelemetryApi.trace.getTracer('reved-kids-fastify'); 