// src/plugins/websocket.ts
import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from '../config/config';

const websocketPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register websocket support
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      verifyClient: (info: any, callback: (result: boolean) => void) => {
        // Add authentication logic here if needed
        callback(true);
      },
    },
  });

  // WebSocket connection management
  const connections = new Map<string, any>();

  // FIXED: Register WebSocket route in a separate context to avoid conflicts
  await fastify.register(async function websocketRoutes(fastify: FastifyInstance) {
    // WebSocket endpoint - separate from HTTP routes
    fastify.get('/ws', { websocket: true }, (connection: any, request: any) => {
      const connectionId = request.id || `conn_${Date.now()}`;
      connections.set(connectionId, connection);

      connection.socket.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'ping':
              connection.socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
            case 'subscribe':
              // Handle subscriptions
              break;
            default:
              fastify.log.warn('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          fastify.log.error('WebSocket message parsing error:', error);
        }
      });

      connection.socket.on('close', () => {
        connections.delete(connectionId);
        fastify.log.info(`WebSocket connection ${connectionId} closed`);
      });

      connection.socket.on('error', (error: Error) => {
        fastify.log.error(`WebSocket connection ${connectionId} error:`, error);
        connections.delete(connectionId);
      });

      fastify.log.info(`WebSocket connection ${connectionId} established`);
    });
  });

  // FIXED: Broadcast helper with proper typing
  fastify.decorate('broadcast', (message: any) => {
    const payload = JSON.stringify(message);
    connections.forEach((connection, id) => {
      try {
        if (connection.socket.readyState === 1) {
          connection.socket.send(payload);
        }
      } catch (error) {
        fastify.log.error(`Failed to send message to connection ${id}:`, error);
        connections.delete(id);
      }
    });
  });

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    connections.forEach((connection, id) => {
      try {
        if (connection.socket.readyState === 1) {
          connection.socket.ping();
        } else {
          connections.delete(id);
        }
      } catch (error) {
        connections.delete(id);
      }
    });
  }, 30000); // 30 seconds heartbeat interval

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    clearInterval(heartbeatInterval);
    connections.clear();
  });

  fastify.log.info('✅ WebSocket plugin registered successfully');
};

export default fp(websocketPlugin, { name: 'websocket' });
