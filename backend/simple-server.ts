import fastify from 'fastify';
import { config } from './src/config/config';

// Create Fastify instance
const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Simple test route
app.get('/test', async () => {
  return { hello: 'world' };
});

// Health check
app.get('/api/health', async () => {
  return {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
});

// Start server
const start = async () => {
  try {
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    app.log.info(`🚀 Simple server started!`);
    app.log.info(`📍 Server: ${address}`);
    app.log.info(`🌍 Environment: ${config.NODE_ENV}`);

  } catch (error) {
    app.log.error('Error starting server:', error);
    process.exit(1);
  }
};

start(); 