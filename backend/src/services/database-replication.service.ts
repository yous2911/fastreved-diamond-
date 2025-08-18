/**
 * Database Replication Service for RevEd Kids
 * Manages MySQL replication setup, monitoring, and failover for high availability
 */

import { connection } from '../db/connection';
import { logger } from '../utils/logger';
import mysql from 'mysql2/promise';
import cron from 'node-cron';
import { EventEmitter } from 'events';

interface ReplicationConfig {
  enabled: boolean;
  topology: 'master-slave' | 'master-master' | 'cluster';
  servers: ReplicationServer[];
  monitoringInterval: number; // seconds
  failoverEnabled: boolean;
  autoFailback: boolean;
  maxReplicationLag: number; // seconds
  healthCheckInterval: number; // seconds
}

interface ReplicationServer {
  id: string;
  role: 'master' | 'slave' | 'arbiter';
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  priority: number; // Higher priority for failover candidate
  isActive: boolean;
  connectionPool?: mysql.Pool;
}

interface ReplicationStatus {
  serverId: string;
  role: 'master' | 'slave';
  status: 'running' | 'stopped' | 'error' | 'lag' | 'disconnected';
  lagSeconds: number;
  masterLogFile?: string;
  masterLogPosition?: number;
  slaveIORunning?: boolean;
  slaveSQLRunning?: boolean;
  lastError?: string;
  lastCheck: Date;
  isHealthy: boolean;
}

interface FailoverEvent {
  id: string;
  timestamp: Date;
  type: 'automatic' | 'manual' | 'planned';
  reason: string;
  oldMaster: string;
  newMaster: string;
  duration: number; // milliseconds
  success: boolean;
  error?: string;
  rollbackPlan?: string;
}

interface ReplicationMetrics {
  timestamp: Date;
  totalServers: number;
  activeServers: number;
  healthyServers: number;
  averageLag: number;
  maxLag: number;
  failoverCount: number;
  uptime: number;
  dataConsistency: 'consistent' | 'inconsistent' | 'unknown';
}

class DatabaseReplicationService extends EventEmitter {
  private config: ReplicationConfig;
  private servers = new Map<string, ReplicationServer>();
  private replicationStatus = new Map<string, ReplicationStatus>();
  private failoverEvents: FailoverEvent[] = [];
  private currentMaster: ReplicationServer | null = null;
  private isInitialized = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private scheduledTasks = new Map<string, cron.ScheduledTask>();
  private metrics: ReplicationMetrics[] = [];

  constructor() {
    super();
    
    this.config = {
      enabled: process.env.REPLICATION_ENABLED === 'true' || false,
      topology: (process.env.REPLICATION_TOPOLOGY as any) || 'master-slave',
      monitoringInterval: parseInt(process.env.REPLICATION_MONITORING_INTERVAL || '30'),
      failoverEnabled: process.env.REPLICATION_FAILOVER_ENABLED === 'true' || false,
      autoFailback: process.env.REPLICATION_AUTO_FAILBACK === 'true' || false,
      maxReplicationLag: parseInt(process.env.REPLICATION_MAX_LAG || '60'),
      healthCheckInterval: parseInt(process.env.REPLICATION_HEALTH_CHECK_INTERVAL || '10'),
      servers: this.loadServerConfiguration()
    };
  }

  private loadServerConfiguration(): ReplicationServer[] {
    // Load from environment variables or configuration file
    const servers: ReplicationServer[] = [];
    
    // Master server (primary database)
    if (process.env.DB_HOST) {
      servers.push({
        id: 'master-1',
        role: 'master',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || '',
        priority: 100,
        isActive: true
      });
    }

    // Slave servers (read replicas)
    const slaveCount = parseInt(process.env.REPLICATION_SLAVE_COUNT || '0');
    for (let i = 1; i <= slaveCount; i++) {
      const host = process.env[`DB_SLAVE${i}_HOST`];
      if (host) {
        servers.push({
          id: `slave-${i}`,
          role: 'slave',
          host,
          port: parseInt(process.env[`DB_SLAVE${i}_PORT`] || '3306'),
          user: process.env[`DB_SLAVE${i}_USER`] || process.env.DB_USER || '',
          password: process.env[`DB_SLAVE${i}_PASSWORD`] || process.env.DB_PASSWORD || '',
          database: process.env[`DB_SLAVE${i}_DATABASE`] || process.env.DB_DATABASE || '',
          priority: 50 + i, // Lower priority than master
          isActive: true
        });
      }
    }

    return servers;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled || this.config.servers.length <= 1) {
      logger.info('Database replication disabled or insufficient servers configured');
      return;
    }

    try {
      logger.info('Initializing database replication service...', {
        topology: this.config.topology,
        serverCount: this.config.servers.length,
        failoverEnabled: this.config.failoverEnabled
      });

      // Initialize server connections
      await this.initializeServers();

      // Detect current master
      await this.detectCurrentMaster();

      // Setup replication monitoring
      this.setupReplicationMonitoring();

      // Setup health checks
      this.setupHealthChecks();

      // Validate replication setup
      await this.validateReplicationSetup();

      this.isInitialized = true;
      logger.info('Database replication service initialized successfully', {
        currentMaster: this.currentMaster?.id,
        activeSlaves: Array.from(this.servers.values()).filter(s => s.role === 'slave' && s.isActive).length
      });

      this.emit('initialized');

    } catch (error) {
      logger.error('Failed to initialize database replication service', { error });
      throw error;
    }
  }

  private async initializeServers(): Promise<void> {
    for (const serverConfig of this.config.servers) {
      try {
        // Create connection pool for each server
        const pool = mysql.createPool({
          host: serverConfig.host,
          port: serverConfig.port,
          user: serverConfig.user,
          password: serverConfig.password,
          database: serverConfig.database,
          connectionLimit: 5,
          acquireTimeout: 10000,
          timeout: 30000,
          reconnect: true
        });

        serverConfig.connectionPool = pool;
        this.servers.set(serverConfig.id, serverConfig);

        // Test connection
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();

        logger.info('Server connection initialized', {
          serverId: serverConfig.id,
          host: serverConfig.host,
          role: serverConfig.role
        });

      } catch (error) {
        logger.error('Failed to initialize server connection', {
          serverId: serverConfig.id,
          host: serverConfig.host,
          error
        });
        serverConfig.isActive = false;
      }
    }
  }

  private async detectCurrentMaster(): Promise<void> {
    // Find the current master by checking server roles
    for (const server of this.servers.values()) {
      if (!server.isActive || !server.connectionPool) continue;

      try {
        const [rows] = await server.connectionPool.execute('SHOW MASTER STATUS');
        
        if ((rows as any[]).length > 0) {
          this.currentMaster = server;
          server.role = 'master';
          
          logger.info('Master server detected', {
            serverId: server.id,
            host: server.host
          });
          break;
        }
      } catch (error) {
        logger.debug('Server is not a master', {
          serverId: server.id,
          error: error.message
        });
      }
    }

    if (!this.currentMaster) {
      // If no master detected, promote the highest priority server
      const candidates = Array.from(this.servers.values())
        .filter(s => s.isActive)
        .sort((a, b) => b.priority - a.priority);

      if (candidates.length > 0) {
        logger.warn('No master detected, promoting highest priority server');
        await this.promoteToMaster(candidates[0].id);
      } else {
        throw new Error('No active servers available for master promotion');
      }
    }
  }

  private setupReplicationMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkReplicationStatus();
      } catch (error) {
        logger.error('Replication monitoring failed', { error });
      }
    }, this.config.monitoringInterval * 1000);

    logger.info('Replication monitoring started', {
      intervalSeconds: this.config.monitoringInterval
    });
  }

  private setupHealthChecks(): void {
    // Periodic health checks
    const healthCheckTask = cron.schedule(`*/${this.config.healthCheckInterval} * * * * *`, async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }, { scheduled: true, name: 'replication-health-check' });

    // Metrics collection
    const metricsTask = cron.schedule('* * * * *', async () => { // Every minute
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Metrics collection failed', { error });
      }
    }, { scheduled: true, name: 'replication-metrics' });

    this.scheduledTasks.set('health-check', healthCheckTask);
    this.scheduledTasks.set('metrics', metricsTask);
  }

  private async validateReplicationSetup(): Promise<void> {
    if (!this.currentMaster) {
      throw new Error('No master server available');
    }

    const slaves = Array.from(this.servers.values()).filter(s => s.role === 'slave' && s.isActive);
    
    for (const slave of slaves) {
      try {
        const status = await this.getSlaveStatus(slave);
        
        if (!status.slaveIORunning || !status.slaveSQLRunning) {
          logger.warn('Slave replication not running properly', {
            slaveId: slave.id,
            ioRunning: status.slaveIORunning,
            sqlRunning: status.slaveSQLRunning
          });
        }

        if (status.lagSeconds > this.config.maxReplicationLag) {
          logger.warn('High replication lag detected', {
            slaveId: slave.id,
            lagSeconds: status.lagSeconds,
            maxLag: this.config.maxReplicationLag
          });
        }

      } catch (error) {
        logger.error('Failed to validate slave replication', {
          slaveId: slave.id,
          error
        });
      }
    }
  }

  private async checkReplicationStatus(): Promise<void> {
    const statusChecks = [];

    for (const server of this.servers.values()) {
      if (!server.isActive) continue;

      statusChecks.push(this.updateServerStatus(server));
    }

    await Promise.allSettled(statusChecks);

    // Check for failover conditions
    if (this.config.failoverEnabled) {
      await this.checkFailoverConditions();
    }
  }

  private async updateServerStatus(server: ReplicationServer): Promise<void> {
    try {
      if (server.role === 'master') {
        await this.updateMasterStatus(server);
      } else {
        await this.updateSlaveStatus(server);
      }
    } catch (error) {
      logger.error('Failed to update server status', {
        serverId: server.id,
        error
      });

      // Mark server as unhealthy
      const status = this.replicationStatus.get(server.id);
      if (status) {
        status.status = 'error';
        status.isHealthy = false;
        status.lastError = error.message;
        status.lastCheck = new Date();
      }
    }
  }

  private async updateMasterStatus(server: ReplicationServer): Promise<void> {
    if (!server.connectionPool) return;

    const [rows] = await server.connectionPool.execute('SHOW MASTER STATUS');
    const masterStatus = (rows as any[])[0];

    const status: ReplicationStatus = {
      serverId: server.id,
      role: 'master',
      status: 'running',
      lagSeconds: 0,
      masterLogFile: masterStatus?.File,
      masterLogPosition: masterStatus?.Position,
      lastCheck: new Date(),
      isHealthy: true
    };

    this.replicationStatus.set(server.id, status);
  }

  private async updateSlaveStatus(server: ReplicationServer): Promise<void> {
    const status = await this.getSlaveStatus(server);
    this.replicationStatus.set(server.id, status);
  }

  private async getSlaveStatus(server: ReplicationServer): Promise<ReplicationStatus> {
    if (!server.connectionPool) {
      throw new Error('No connection pool for server');
    }

    const [rows] = await server.connectionPool.execute('SHOW SLAVE STATUS');
    const slaveStatus = (rows as any[])[0];

    if (!slaveStatus) {
      throw new Error('Server is not configured as a slave');
    }

    const lagSeconds = slaveStatus.Seconds_Behind_Master !== null 
      ? parseInt(slaveStatus.Seconds_Behind_Master) 
      : 0;

    const status: ReplicationStatus = {
      serverId: server.id,
      role: 'slave',
      status: this.determineSlaveStatus(slaveStatus, lagSeconds),
      lagSeconds,
      slaveIORunning: slaveStatus.Slave_IO_Running === 'Yes',
      slaveSQLRunning: slaveStatus.Slave_SQL_Running === 'Yes',
      lastError: slaveStatus.Last_Error || undefined,
      lastCheck: new Date(),
      isHealthy: this.isSlaveHealthy(slaveStatus, lagSeconds)
    };

    return status;
  }

  private determineSlaveStatus(slaveStatus: any, lagSeconds: number): ReplicationStatus['status'] {
    if (slaveStatus.Slave_IO_Running !== 'Yes' || slaveStatus.Slave_SQL_Running !== 'Yes') {
      return 'stopped';
    }
    
    if (lagSeconds > this.config.maxReplicationLag) {
      return 'lag';
    }

    if (slaveStatus.Last_Error) {
      return 'error';
    }

    return 'running';
  }

  private isSlaveHealthy(slaveStatus: any, lagSeconds: number): boolean {
    return slaveStatus.Slave_IO_Running === 'Yes' &&
           slaveStatus.Slave_SQL_Running === 'Yes' &&
           lagSeconds <= this.config.maxReplicationLag &&
           !slaveStatus.Last_Error;
  }

  private async checkFailoverConditions(): Promise<void> {
    if (!this.currentMaster) return;

    const masterStatus = this.replicationStatus.get(this.currentMaster.id);
    
    if (masterStatus && !masterStatus.isHealthy) {
      logger.warn('Master server unhealthy, considering failover', {
        masterId: this.currentMaster.id,
        status: masterStatus.status,
        error: masterStatus.lastError
      });

      await this.initiateFailover('Master server unhealthy');
    }
  }

  private async performHealthChecks(): Promise<void> {
    const healthPromises = [];

    for (const server of this.servers.values()) {
      if (server.isActive && server.connectionPool) {
        healthPromises.push(this.checkServerHealth(server));
      }
    }

    await Promise.allSettled(healthPromises);
  }

  private async checkServerHealth(server: ReplicationServer): Promise<void> {
    try {
      const connection = await server.connectionPool!.getConnection();
      await connection.ping();
      connection.release();

      // Update server as active if it was previously inactive
      if (!server.isActive) {
        server.isActive = true;
        logger.info('Server recovered', { serverId: server.id });
        this.emit('serverRecovered', server);
      }

    } catch (error) {
      if (server.isActive) {
        server.isActive = false;
        logger.error('Server health check failed', {
          serverId: server.id,
          error: error.message
        });
        this.emit('serverFailed', server);
      }
    }
  }

  private async collectMetrics(): Promise<void> {
    const activeServers = Array.from(this.servers.values()).filter(s => s.isActive);
    const healthyServers = activeServers.filter(s => {
      const status = this.replicationStatus.get(s.id);
      return status?.isHealthy;
    });

    const lagValues = Array.from(this.replicationStatus.values())
      .filter(status => status.role === 'slave')
      .map(status => status.lagSeconds);

    const metrics: ReplicationMetrics = {
      timestamp: new Date(),
      totalServers: this.servers.size,
      activeServers: activeServers.length,
      healthyServers: healthyServers.length,
      averageLag: lagValues.length > 0 ? lagValues.reduce((sum, lag) => sum + lag, 0) / lagValues.length : 0,
      maxLag: lagValues.length > 0 ? Math.max(...lagValues) : 0,
      failoverCount: this.failoverEvents.length,
      uptime: this.isInitialized ? Date.now() - this.getInitializationTime() : 0,
      dataConsistency: await this.checkDataConsistency()
    };

    this.metrics.push(metrics);
    
    // Keep only recent metrics (last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  private getInitializationTime(): number {
    // This would need to be tracked properly
    return Date.now() - 60 * 60 * 1000; // Simplified: assume 1 hour ago
  }

  private async checkDataConsistency(): Promise<'consistent' | 'inconsistent' | 'unknown'> {
    try {
      if (!this.currentMaster) return 'unknown';

      // Simple consistency check: compare row counts between master and slaves
      const slaves = Array.from(this.servers.values()).filter(s => s.role === 'slave' && s.isActive);
      
      if (slaves.length === 0) return 'unknown';

      // Get master table checksums
      const masterChecksums = await this.getTableChecksums(this.currentMaster);
      
      // Compare with slaves
      for (const slave of slaves) {
        const slaveChecksums = await this.getTableChecksums(slave);
        
        for (const [table, masterChecksum] of masterChecksums.entries()) {
          const slaveChecksum = slaveChecksums.get(table);
          if (slaveChecksum && slaveChecksum !== masterChecksum) {
            return 'inconsistent';
          }
        }
      }

      return 'consistent';
    } catch (error) {
      logger.debug('Could not check data consistency', { error: error.message });
      return 'unknown';
    }
  }

  private async getTableChecksums(server: ReplicationServer): Promise<Map<string, string>> {
    const checksums = new Map<string, string>();
    
    if (!server.connectionPool) return checksums;

    try {
      // Get table list
      const [tables] = await server.connectionPool.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_TYPE = 'BASE TABLE'
      `, [server.database]);

      // Calculate checksums for each table (simplified)
      for (const table of tables as any[]) {
        try {
          const [rows] = await server.connectionPool.execute(`
            SELECT COUNT(*) as count 
            FROM ${table.TABLE_NAME}
          `);
          
          checksums.set(table.TABLE_NAME, (rows as any[])[0].count.toString());
        } catch (error) {
          // Skip tables that can't be accessed
        }
      }
    } catch (error) {
      logger.debug('Failed to get table checksums', {
        serverId: server.id,
        error: error.message
      });
    }

    return checksums;
  }

  async initiateFailover(reason: string, targetServerId?: string): Promise<string> {
    const failoverEvent: FailoverEvent = {
      id: this.generateFailoverId(),
      timestamp: new Date(),
      type: targetServerId ? 'manual' : 'automatic',
      reason,
      oldMaster: this.currentMaster?.id || 'unknown',
      newMaster: 'pending',
      duration: 0,
      success: false
    };

    try {
      logger.warn('Initiating database failover', {
        failoverId: failoverEvent.id,
        reason,
        oldMaster: failoverEvent.oldMaster,
        targetSlave: targetServerId
      });

      const startTime = Date.now();

      // Select new master
      const newMaster = await this.selectNewMaster(targetServerId);
      if (!newMaster) {
        throw new Error('No suitable server found for promotion');
      }

      failoverEvent.newMaster = newMaster.id;

      // Promote new master
      await this.promoteToMaster(newMaster.id);

      // Update slave configurations to point to new master
      await this.reconfigureSlaves(newMaster);

      failoverEvent.duration = Date.now() - startTime;
      failoverEvent.success = true;

      this.failoverEvents.push(failoverEvent);

      logger.info('Failover completed successfully', {
        failoverId: failoverEvent.id,
        newMaster: newMaster.id,
        duration: failoverEvent.duration
      });

      this.emit('failoverCompleted', failoverEvent);

      return failoverEvent.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      failoverEvent.error = errorMessage;
      failoverEvent.duration = Date.now() - failoverEvent.timestamp.getTime();
      this.failoverEvents.push(failoverEvent);

      logger.error('Failover failed', {
        failoverId: failoverEvent.id,
        error: errorMessage
      });

      this.emit('failoverFailed', failoverEvent);
      throw error;
    }
  }

  private async selectNewMaster(targetServerId?: string): Promise<ReplicationServer | null> {
    if (targetServerId) {
      const target = this.servers.get(targetServerId);
      if (target && target.isActive && target.role === 'slave') {
        return target;
      }
    }

    // Select best candidate based on priority and lag
    const candidates = Array.from(this.servers.values())
      .filter(s => s.role === 'slave' && s.isActive)
      .map(server => {
        const status = this.replicationStatus.get(server.id);
        return {
          server,
          status,
          score: server.priority - (status?.lagSeconds || 999) // Higher priority, lower lag = higher score
        };
      })
      .filter(candidate => candidate.status?.isHealthy)
      .sort((a, b) => b.score - a.score);

    return candidates.length > 0 ? candidates[0].server : null;
  }

  private async promoteToMaster(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server || !server.connectionPool) {
      throw new Error(`Server ${serverId} not found or not connected`);
    }

    try {
      // Stop slave processes
      await server.connectionPool.execute('STOP SLAVE');
      
      // Reset master configuration
      await server.connectionPool.execute('RESET MASTER');
      
      // Update server role
      const oldMaster = this.currentMaster;
      if (oldMaster) {
        oldMaster.role = 'slave';
        oldMaster.isActive = false; // Disable failed master
      }

      server.role = 'master';
      this.currentMaster = server;

      logger.info('Server promoted to master', {
        serverId,
        host: server.host
      });

    } catch (error) {
      throw new Error(`Failed to promote ${serverId} to master: ${error.message}`);
    }
  }

  private async reconfigureSlaves(newMaster: ReplicationServer): Promise<void> {
    const slaves = Array.from(this.servers.values())
      .filter(s => s.role === 'slave' && s.isActive && s.id !== newMaster.id);

    const reconfigurePromises = slaves.map(slave => this.reconfigureSlave(slave, newMaster));
    await Promise.allSettled(reconfigurePromises);
  }

  private async reconfigureSlave(slave: ReplicationServer, newMaster: ReplicationServer): Promise<void> {
    if (!slave.connectionPool) return;

    try {
      // Stop current replication
      await slave.connectionPool.execute('STOP SLAVE');

      // Configure new master
      await slave.connectionPool.execute(`
        CHANGE MASTER TO
        MASTER_HOST = ?,
        MASTER_PORT = ?,
        MASTER_USER = ?,
        MASTER_PASSWORD = ?,
        MASTER_AUTO_POSITION = 1
      `, [newMaster.host, newMaster.port, newMaster.user, newMaster.password]);

      // Start replication
      await slave.connectionPool.execute('START SLAVE');

      logger.info('Slave reconfigured for new master', {
        slaveId: slave.id,
        newMasterId: newMaster.id
      });

    } catch (error) {
      logger.error('Failed to reconfigure slave', {
        slaveId: slave.id,
        newMasterId: newMaster.id,
        error: error.message
      });
    }
  }

  private generateFailoverId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `failover-${timestamp}-${random}`;
  }

  // Public API methods
  async getReplicationStatus(): Promise<ReplicationStatus[]> {
    return Array.from(this.replicationStatus.values());
  }

  async getServerHealth(): Promise<{ serverId: string; isHealthy: boolean; role: string; lastCheck: Date }[]> {
    return Array.from(this.servers.values()).map(server => {
      const status = this.replicationStatus.get(server.id);
      return {
        serverId: server.id,
        isHealthy: status?.isHealthy || false,
        role: server.role,
        lastCheck: status?.lastCheck || new Date(0)
      };
    });
  }

  async getFailoverHistory(): Promise<FailoverEvent[]> {
    return [...this.failoverEvents];
  }

  async getReplicationMetrics(): Promise<ReplicationMetrics | null> {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getCurrentMaster(): ReplicationServer | null {
    return this.currentMaster;
  }

  async manualFailover(targetServerId?: string): Promise<string> {
    return this.initiateFailover('Manual failover initiated', targetServerId);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down database replication service...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.debug(`Stopped scheduled task: ${name}`);
    });
    this.scheduledTasks.clear();

    // Close all connection pools
    for (const server of this.servers.values()) {
      if (server.connectionPool) {
        await server.connectionPool.end();
      }
    }

    this.isInitialized = false;
    logger.info('Database replication service shutdown completed');
  }
}

// Create and export singleton instance
export const databaseReplicationService = new DatabaseReplicationService();

// Export types
export {
  ReplicationConfig,
  ReplicationServer,
  ReplicationStatus,
  FailoverEvent,
  ReplicationMetrics
};

export default databaseReplicationService;