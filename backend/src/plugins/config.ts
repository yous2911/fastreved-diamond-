// src/plugins/config.ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { config, dbConfig, redisConfig, jwtConfig } from '../config/config';

const configPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate fastify with config
  fastify.decorate('config', {
    ...config,
    db: dbConfig,
    redis: redisConfig,
    jwt: jwtConfig,
  } as any);
};

export default fp(configPlugin, {
  name: 'config',
}); 