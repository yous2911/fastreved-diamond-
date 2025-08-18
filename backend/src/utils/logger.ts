// Conditional pino import
let pino: any;
try {
  pino = require('pino');
} catch (error) {
  console.warn('Pino not installed, using console logger');
  pino = () => ({
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    trace: console.trace,
    child: () => pino(),
  });
}

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
