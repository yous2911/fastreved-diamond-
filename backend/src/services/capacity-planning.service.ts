/**
 * Capacity Planning Service for RevEd Kids
 * Provides comprehensive capacity analysis, growth predictions, and scaling recommendations
 */

import { connection } from '../db/connection';
import { logger } from '../utils/logger';
import { databaseMonitorService } from './database-monitor.service';
import { performanceBenchmarkService } from './performance-benchmark.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import cron from 'node-cron';

interface CapacityMetrics {
  timestamp: Date;
  database: {
    size: number; // bytes
    tableCount: number;
    rowCount: number;
    indexSize: number;
    growthRate: number; // bytes per day
  };
  connections: {
    maxConnections: number;
    activeConnections: number;
    peakConnections: number;
    utilizationRate: number; // percentage
  };
  performance: {
    avgResponseTime: number; // ms
    throughput: number; // requests per second
    errorRate: number; // percentage
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    concurrentUsers: number;
    userGrowthRate: number; // users per day
  };
}

interface GrowthProjection {
  metric: string;
  currentValue: number;
  projectedValues: {
    in30Days: number;
    in90Days: number;
    in180Days: number;
    in365Days: number;
  };
  growthRate: number; // per day
  confidence: number; // 0-100
  trend: 'linear' | 'exponential' | 'logarithmic' | 'seasonal';
}

interface CapacityThreshold {
  metric: string;
  currentValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  maxCapacity: number;
  estimatedTimeToWarning?: number; // days
  estimatedTimeToCritical?: number; // days
  estimatedTimeToMax?: number; // days
}

interface ScalingRecommendation {
  id: string;
  category: 'database' | 'server' | 'network' | 'storage';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggerCondition: string;
  action: string;
  estimatedCost: string;
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    timeRequired: string;
    prerequisites: string[];
    steps: string[];
  };
  impact: {
    performanceImprovement: string;
    capacityIncrease: string;
    maintenanceReduction?: string;
  };
}

interface CapacityPlan {
  id: string;
  generatedAt: Date;
  timeHorizon: '30d' | '90d' | '180d' | '365d';
  summary: {
    overallStatus: 'healthy' | 'approaching_limits' | 'at_risk' | 'critical';
    immediateActions: number;
    plannedActions: number;
    estimatedCosts: string;
  };
  currentMetrics: CapacityMetrics;
  projections: GrowthProjection[];
  thresholds: CapacityThreshold[];
  recommendations: ScalingRecommendation[];
  scenarios: CapacityScenario[];
}

interface CapacityScenario {
  name: string;
  description: string;
  assumptions: string[];
  projectedMetrics: CapacityMetrics;
  requiredActions: string[];
  estimatedCost: string;
}

class CapacityPlanningService {
  private metrics: CapacityMetrics[] = [];
  private thresholds: CapacityThreshold[] = [];
  private recommendations: ScalingRecommendation[] = [];
  private scheduledTasks = new Map<string, cron.ScheduledTask>();
  private outputPath: string;
  private isInitialized = false;

  constructor() {
    this.outputPath = process.env.CAPACITY_PLANNING_OUTPUT_PATH || 
                     join(process.cwd(), 'capacity-planning');
    this.initializeDefaultThresholds();
    this.initializeDefaultRecommendations();
  }

  private initializeDefaultThresholds(): void {
    this.thresholds = [
      {
        metric: 'database_size',
        currentValue: 0,
        warningThreshold: 50 * 1024 * 1024 * 1024, // 50GB
        criticalThreshold: 80 * 1024 * 1024 * 1024, // 80GB
        maxCapacity: 100 * 1024 * 1024 * 1024 // 100GB
      },
      {
        metric: 'connection_utilization',
        currentValue: 0,
        warningThreshold: 70, // 70%
        criticalThreshold: 85, // 85%
        maxCapacity: 95 // 95%
      },
      {
        metric: 'response_time',
        currentValue: 0,
        warningThreshold: 1000, // 1 second
        criticalThreshold: 2000, // 2 seconds
        maxCapacity: 5000 // 5 seconds
      },
      {
        metric: 'memory_usage',
        currentValue: 0,
        warningThreshold: 75, // 75%
        criticalThreshold: 90, // 90%
        maxCapacity: 95 // 95%
      },
      {
        metric: 'concurrent_users',
        currentValue: 0,
        warningThreshold: 1000,
        criticalThreshold: 2000,
        maxCapacity: 3000
      }
    ];
  }

  private initializeDefaultRecommendations(): void {
    this.recommendations = [
      {
        id: 'db_storage_expansion',
        category: 'database',
        priority: 'high',
        title: 'Database Storage Expansion',
        description: 'Increase database storage capacity',
        triggerCondition: 'database_size > warning_threshold',
        action: 'Expand database storage or implement archiving',
        estimatedCost: '€500-2000/month',
        implementation: {
          complexity: 'medium',
          timeRequired: '4-8 hours',
          prerequisites: ['Maintenance window', 'Backup verification'],
          steps: [
            'Create full database backup',
            'Plan maintenance window',
            'Resize storage volume',
            'Verify database integrity',
            'Update monitoring thresholds'
          ]
        },
        impact: {
          performanceImprovement: 'Prevents storage-related slowdowns',
          capacityIncrease: '50-100GB additional capacity',
          maintenanceReduction: 'Reduces emergency interventions'
        }
      },
      {
        id: 'connection_pool_optimization',
        category: 'database',
        priority: 'medium',
        title: 'Connection Pool Optimization',
        description: 'Optimize database connection pool settings',
        triggerCondition: 'connection_utilization > warning_threshold',
        action: 'Increase connection pool size or optimize connection usage',
        estimatedCost: '€200-500 (development time)',
        implementation: {
          complexity: 'low',
          timeRequired: '2-4 hours',
          prerequisites: ['Performance analysis', 'Load testing'],
          steps: [
            'Analyze current connection patterns',
            'Adjust pool size parameters',
            'Implement connection optimization',
            'Monitor performance impact',
            'Fine-tune settings'
          ]
        },
        impact: {
          performanceImprovement: '20-40% faster response times',
          capacityIncrease: '50-100% more concurrent users'
        }
      },
      {
        id: 'read_replica_setup',
        category: 'database',
        priority: 'high',
        title: 'Read Replica Implementation',
        description: 'Set up database read replicas for load distribution',
        triggerCondition: 'concurrent_users > 500',
        action: 'Implement read replicas and load balancing',
        estimatedCost: '€1000-3000/month',
        implementation: {
          complexity: 'high',
          timeRequired: '16-32 hours',
          prerequisites: ['Master-slave replication setup', 'Application modifications'],
          steps: [
            'Setup replication configuration',
            'Deploy read replica servers',
            'Modify application for read/write splitting',
            'Implement load balancing',
            'Monitor replication lag',
            'Test failover procedures'
          ]
        },
        impact: {
          performanceImprovement: '50-80% read query performance',
          capacityIncrease: '2-3x read capacity'
        }
      },
      {
        id: 'caching_layer_enhancement',
        category: 'server',
        priority: 'medium',
        title: 'Enhanced Caching Implementation',
        description: 'Implement comprehensive caching strategy',
        triggerCondition: 'response_time > warning_threshold',
        action: 'Deploy Redis cluster and implement application caching',
        estimatedCost: '€300-1000/month',
        implementation: {
          complexity: 'medium',
          timeRequired: '8-16 hours',
          prerequisites: ['Redis infrastructure', 'Cache strategy design'],
          steps: [
            'Deploy Redis cluster',
            'Implement cache layers',
            'Add cache warming strategies',
            'Monitor cache hit rates',
            'Optimize cache TTL settings'
          ]
        },
        impact: {
          performanceImprovement: '40-70% response time improvement',
          capacityIncrease: '3-5x request handling capacity'
        }
      },
      {
        id: 'auto_scaling_implementation',
        category: 'server',
        priority: 'high',
        title: 'Auto-scaling Infrastructure',
        description: 'Implement horizontal auto-scaling',
        triggerCondition: 'cpu_usage > 80% OR memory_usage > 80%',
        action: 'Set up container orchestration with auto-scaling',
        estimatedCost: '€500-2000/month',
        implementation: {
          complexity: 'high',
          timeRequired: '24-48 hours',
          prerequisites: ['Containerization', 'Load balancer', 'Monitoring setup'],
          steps: [
            'Containerize applications',
            'Setup Kubernetes/Docker Swarm',
            'Configure auto-scaling policies',
            'Implement health checks',
            'Test scaling scenarios',
            'Monitor resource usage'
          ]
        },
        impact: {
          performanceImprovement: 'Maintains consistent performance under load',
          capacityIncrease: 'Unlimited horizontal scaling'
        }
      },
      {
        id: 'data_archiving_strategy',
        category: 'storage',
        priority: 'medium',
        title: 'Automated Data Archiving',
        description: 'Implement automated old data archiving',
        triggerCondition: 'database_size > 75% of max_capacity',
        action: 'Set up automated archiving for old records',
        estimatedCost: '€200-800/month',
        implementation: {
          complexity: 'medium',
          timeRequired: '8-16 hours',
          prerequisites: ['Archive storage', 'Data retention policies'],
          steps: [
            'Define data retention policies',
            'Set up archive storage',
            'Implement archiving scripts',
            'Schedule automated archiving',
            'Test restoration procedures'
          ]
        },
        impact: {
          performanceImprovement: '20-30% faster queries',
          capacityIncrease: '30-50% effective storage increase'
        }
      }
    ];
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing capacity planning service...');

      // Ensure output directory exists
      await fs.mkdir(this.outputPath, { recursive: true });

      // Setup scheduled capacity analysis
      this.setupScheduledAnalysis();

      // Collect initial metrics
      await this.collectCurrentMetrics();

      this.isInitialized = true;
      logger.info('Capacity planning service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize capacity planning service', { error });
      throw error;
    }
  }

  private setupScheduledAnalysis(): void {
    // Daily capacity metrics collection
    const metricsTask = cron.schedule('0 6 * * *', async () => { // 6 AM daily
      try {
        await this.collectCurrentMetrics();
      } catch (error) {
        logger.error('Daily metrics collection failed', { error });
      }
    }, { scheduled: true, name: 'capacity-metrics' });

    // Weekly capacity planning analysis
    const planningTask = cron.schedule('0 8 * * 1', async () => { // 8 AM Mondays
      try {
        await this.generateCapacityPlan('90d');
      } catch (error) {
        logger.error('Weekly capacity planning failed', { error });
      }
    }, { scheduled: true, name: 'capacity-planning' });

    // Monthly comprehensive analysis
    const comprehensiveTask = cron.schedule('0 9 1 * *', async () => { // 9 AM 1st of month
      try {
        await this.generateCapacityPlan('365d');
      } catch (error) {
        logger.error('Monthly capacity planning failed', { error });
      }
    }, { scheduled: true, name: 'comprehensive-planning' });

    this.scheduledTasks.set('metrics', metricsTask);
    this.scheduledTasks.set('planning', planningTask);
    this.scheduledTasks.set('comprehensive', comprehensiveTask);

    logger.info('Capacity planning scheduled tasks configured');
  }

  private async collectCurrentMetrics(): Promise<CapacityMetrics> {
    try {
      const [
        databaseMetrics,
        userMetrics,
        performanceMetrics,
        systemMetrics
      ] = await Promise.allSettled([
        this.getDatabaseMetrics(),
        this.getUserMetrics(),
        this.getPerformanceMetrics(),
        this.getSystemMetrics()
      ]);

      const metrics: CapacityMetrics = {
        timestamp: new Date(),
        database: databaseMetrics.status === 'fulfilled' ? databaseMetrics.value : {
          size: 0, tableCount: 0, rowCount: 0, indexSize: 0, growthRate: 0
        },
        connections: {
          maxConnections: 100, // Default
          activeConnections: 0,
          peakConnections: 0,
          utilizationRate: 0
        },
        performance: performanceMetrics.status === 'fulfilled' ? performanceMetrics.value : {
          avgResponseTime: 0, throughput: 0, errorRate: 0, cpuUsage: 0, memoryUsage: 0
        },
        users: userMetrics.status === 'fulfilled' ? userMetrics.value : {
          totalUsers: 0, activeUsers: 0, concurrentUsers: 0, userGrowthRate: 0
        }
      };

      // Update connection metrics from monitoring service
      if (databaseMonitorService) {
        const monitorMetrics = await databaseMonitorService.getLatestMetrics();
        if (monitorMetrics) {
          metrics.connections = {
            maxConnections: monitorMetrics.connections.total || 100,
            activeConnections: monitorMetrics.connections.active,
            peakConnections: monitorMetrics.connections.active,
            utilizationRate: monitorMetrics.connections.utilization
          };
        }
      }

      this.metrics.push(metrics);
      
      // Keep only last 365 days of metrics
      const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

      // Update thresholds with current values
      this.updateThresholds(metrics);

      return metrics;

    } catch (error) {
      logger.error('Failed to collect capacity metrics', { error });
      throw error;
    }
  }

  private async getDatabaseMetrics(): Promise<CapacityMetrics['database']> {
    const [sizeRows] = await connection.execute(`
      SELECT 
        ROUND(SUM(data_length + index_length), 0) as total_size,
        ROUND(SUM(index_length), 0) as index_size,
        COUNT(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    const [rowCountRows] = await connection.execute(`
      SELECT SUM(table_rows) as total_rows
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
    `);

    const sizeData = (sizeRows as any[])[0];
    const rowData = (rowCountRows as any[])[0];

    // Calculate growth rate from historical data
    const growthRate = this.calculateDatabaseGrowthRate();

    return {
      size: parseInt(sizeData.total_size) || 0,
      indexSize: parseInt(sizeData.index_size) || 0,
      tableCount: parseInt(sizeData.table_count) || 0,
      rowCount: parseInt(rowData.total_rows) || 0,
      growthRate
    };
  }

  private async getUserMetrics(): Promise<CapacityMetrics['users']> {
    const [userRows] = await connection.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN dernier_acces > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_users,
        COUNT(CASE WHEN est_connecte = 1 THEN 1 END) as concurrent_users
      FROM students
    `);

    const userData = (userRows as any[])[0];
    const userGrowthRate = this.calculateUserGrowthRate();

    return {
      totalUsers: parseInt(userData.total_users) || 0,
      activeUsers: parseInt(userData.active_users) || 0,
      concurrentUsers: parseInt(userData.concurrent_users) || 0,
      userGrowthRate
    };
  }

  private async getPerformanceMetrics(): Promise<CapacityMetrics['performance']> {
    // Get performance data from monitoring service
    let avgResponseTime = 0;
    let throughput = 0;
    let errorRate = 0;

    try {
      const monitorMetrics = await databaseMonitorService.getLatestMetrics();
      if (monitorMetrics) {
        avgResponseTime = monitorMetrics.queries.averageQueryTime;
        throughput = monitorMetrics.queries.queriesPerSecond;
      }
    } catch (error) {
      logger.debug('Could not get monitoring metrics', { error });
    }

    // Get system metrics
    const os = require('os');
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

    return {
      avgResponseTime,
      throughput,
      errorRate,
      cpuUsage,
      memoryUsage
    };
  }

  private async getSystemMetrics(): Promise<any> {
    const os = require('os');
    return {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      platform: os.platform()
    };
  }

  private calculateDatabaseGrowthRate(): number {
    if (this.metrics.length < 2) return 0;

    const recent = this.metrics.slice(-7); // Last 7 days
    if (recent.length < 2) return 0;

    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const daysDiff = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 0) return 0;

    return (newest.database.size - oldest.database.size) / daysDiff;
  }

  private calculateUserGrowthRate(): number {
    if (this.metrics.length < 2) return 0;

    const recent = this.metrics.slice(-30); // Last 30 days
    if (recent.length < 2) return 0;

    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const daysDiff = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 0) return 0;

    return (newest.users.totalUsers - oldest.users.totalUsers) / daysDiff;
  }

  private getCpuUsage(): number {
    // Simplified CPU usage calculation
    const os = require('os');
    const cpus = os.cpus();
    
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach((cpu: any) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    return ((totalTick - totalIdle) / totalTick) * 100;
  }

  private updateThresholds(metrics: CapacityMetrics): void {
    // Update current values in thresholds
    const thresholdMap = new Map([
      ['database_size', metrics.database.size],
      ['connection_utilization', metrics.connections.utilizationRate],
      ['response_time', metrics.performance.avgResponseTime],
      ['memory_usage', metrics.performance.memoryUsage],
      ['concurrent_users', metrics.users.concurrentUsers]
    ]);

    this.thresholds.forEach(threshold => {
      const currentValue = thresholdMap.get(threshold.metric);
      if (currentValue !== undefined) {
        threshold.currentValue = currentValue;
      }
    });
  }

  async generateCapacityPlan(timeHorizon: '30d' | '90d' | '180d' | '365d'): Promise<CapacityPlan> {
    try {
      logger.info('Generating capacity plan', { timeHorizon });

      if (this.metrics.length === 0) {
        await this.collectCurrentMetrics();
      }

      const currentMetrics = this.metrics[this.metrics.length - 1];
      
      // Generate projections
      const projections = this.generateGrowthProjections(timeHorizon);
      
      // Calculate threshold estimates
      await this.calculateThresholdEstimates(projections);
      
      // Generate recommendations
      const activeRecommendations = this.getActiveRecommendations();
      
      // Generate scenarios
      const scenarios = this.generateCapacityScenarios(timeHorizon, projections);
      
      // Determine overall status
      const overallStatus = this.determineOverallStatus();

      const plan: CapacityPlan = {
        id: `capacity-plan-${Date.now()}`,
        generatedAt: new Date(),
        timeHorizon,
        summary: {
          overallStatus,
          immediateActions: activeRecommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length,
          plannedActions: activeRecommendations.filter(r => r.priority === 'medium' || r.priority === 'low').length,
          estimatedCosts: this.calculateTotalEstimatedCosts(activeRecommendations)
        },
        currentMetrics,
        projections,
        thresholds: [...this.thresholds],
        recommendations: activeRecommendations,
        scenarios
      };

      // Save plan
      await this.saveCapacityPlan(plan);

      logger.info('Capacity plan generated', {
        planId: plan.id,
        overallStatus: plan.summary.overallStatus,
        immediateActions: plan.summary.immediateActions
      });

      return plan;

    } catch (error) {
      logger.error('Failed to generate capacity plan', { error });
      throw error;
    }
  }

  private generateGrowthProjections(timeHorizon: string): GrowthProjection[] {
    const projections: GrowthProjection[] = [];
    
    if (this.metrics.length < 3) {
      return projections; // Need historical data
    }

    const daysMap: Record<string, number> = {
      '30d': 30, '90d': 90, '180d': 180, '365d': 365
    };
    const days = daysMap[timeHorizon];

    // Database size projection
    const dbGrowthRate = this.calculateDatabaseGrowthRate();
    const currentDbSize = this.metrics[this.metrics.length - 1].database.size;
    
    projections.push({
      metric: 'Database Size',
      currentValue: currentDbSize,
      projectedValues: {
        in30Days: currentDbSize + (dbGrowthRate * 30),
        in90Days: currentDbSize + (dbGrowthRate * 90),
        in180Days: currentDbSize + (dbGrowthRate * 180),
        in365Days: currentDbSize + (dbGrowthRate * 365)
      },
      growthRate: dbGrowthRate,
      confidence: this.calculateConfidence(this.metrics.map(m => m.database.size)),
      trend: 'linear'
    });

    // User growth projection
    const userGrowthRate = this.calculateUserGrowthRate();
    const currentUsers = this.metrics[this.metrics.length - 1].users.totalUsers;
    
    projections.push({
      metric: 'Total Users',
      currentValue: currentUsers,
      projectedValues: {
        in30Days: currentUsers + (userGrowthRate * 30),
        in90Days: currentUsers + (userGrowthRate * 90),
        in180Days: currentUsers + (userGrowthRate * 180),
        in365Days: currentUsers + (userGrowthRate * 365)
      },
      growthRate: userGrowthRate,
      confidence: this.calculateConfidence(this.metrics.map(m => m.users.totalUsers)),
      trend: userGrowthRate > 1 ? 'exponential' : 'linear'
    });

    // Connection utilization projection
    const recentMetrics = this.metrics.slice(-30);
    const avgUtilization = recentMetrics.reduce((sum, m) => sum + m.connections.utilizationRate, 0) / recentMetrics.length;
    const utilizationTrend = this.calculateTrend(recentMetrics.map(m => m.connections.utilizationRate));

    projections.push({
      metric: 'Connection Utilization',
      currentValue: avgUtilization,
      projectedValues: {
        in30Days: avgUtilization + (utilizationTrend * 30),
        in90Days: avgUtilization + (utilizationTrend * 90),
        in180Days: avgUtilization + (utilizationTrend * 180),
        in365Days: avgUtilization + (utilizationTrend * 365)
      },
      growthRate: utilizationTrend,
      confidence: this.calculateConfidence(recentMetrics.map(m => m.connections.utilizationRate)),
      trend: 'linear'
    });

    return projections;
  }

  private calculateConfidence(values: number[]): number {
    if (values.length < 3) return 50;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    
    // Lower coefficient of variation = higher confidence
    return Math.max(20, Math.min(95, 100 - (coefficientOfVariation * 100)));
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumX2 = values.reduce((sum, v, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private async calculateThresholdEstimates(projections: GrowthProjection[]): Promise<void> {
    for (const threshold of this.thresholds) {
      const projection = projections.find(p => 
        p.metric.toLowerCase().includes(threshold.metric.split('_')[0])
      );
      
      if (projection && projection.growthRate > 0) {
        const daysToWarning = (threshold.warningThreshold - threshold.currentValue) / projection.growthRate;
        const daysToCritical = (threshold.criticalThreshold - threshold.currentValue) / projection.growthRate;
        const daysToMax = (threshold.maxCapacity - threshold.currentValue) / projection.growthRate;
        
        threshold.estimatedTimeToWarning = daysToWarning > 0 ? Math.ceil(daysToWarning) : undefined;
        threshold.estimatedTimeToCritical = daysToCritical > 0 ? Math.ceil(daysToCritical) : undefined;
        threshold.estimatedTimeToMax = daysToMax > 0 ? Math.ceil(daysToMax) : undefined;
      }
    }
  }

  private getActiveRecommendations(): ScalingRecommendation[] {
    const activeRecommendations: ScalingRecommendation[] = [];

    for (const recommendation of this.recommendations) {
      if (this.shouldRecommendationBeActive(recommendation)) {
        activeRecommendations.push(recommendation);
      }
    }

    return activeRecommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private shouldRecommendationBeActive(recommendation: ScalingRecommendation): boolean {
    const condition = recommendation.triggerCondition.toLowerCase();
    
    if (this.metrics.length === 0) return false;
    
    const latest = this.metrics[this.metrics.length - 1];
    
    // Simple condition evaluation
    if (condition.includes('database_size > warning_threshold')) {
      const dbThreshold = this.thresholds.find(t => t.metric === 'database_size');
      return dbThreshold ? latest.database.size > dbThreshold.warningThreshold : false;
    }
    
    if (condition.includes('connection_utilization > warning_threshold')) {
      return latest.connections.utilizationRate > 70;
    }
    
    if (condition.includes('response_time > warning_threshold')) {
      return latest.performance.avgResponseTime > 1000;
    }
    
    if (condition.includes('concurrent_users > 500')) {
      return latest.users.concurrentUsers > 500;
    }
    
    if (condition.includes('cpu_usage > 80%') || condition.includes('memory_usage > 80%')) {
      return latest.performance.cpuUsage > 80 || latest.performance.memoryUsage > 80;
    }
    
    return false;
  }

  private generateCapacityScenarios(
    timeHorizon: string, 
    projections: GrowthProjection[]
  ): CapacityScenario[] {
    const scenarios: CapacityScenario[] = [];
    
    if (this.metrics.length === 0) return scenarios;
    
    const current = this.metrics[this.metrics.length - 1];
    const timeframes = { '30d': 'in30Days', '90d': 'in90Days', '180d': 'in180Days', '365d': 'in365Days' };
    const timeframe = timeframes[timeHorizon] as keyof GrowthProjection['projectedValues'];
    
    // Conservative scenario (50% of projected growth)
    const conservativeProjections = projections.map(p => ({
      ...p,
      projectedValue: p.currentValue + ((p.projectedValues[timeframe] - p.currentValue) * 0.5)
    }));
    
    scenarios.push({
      name: 'Conservative Growth',
      description: '50% of projected growth rate - minimal changes needed',
      assumptions: [
        'User growth slows down',
        'Current optimization efforts succeed',
        'No major feature releases'
      ],
      projectedMetrics: this.buildScenarioMetrics(current, conservativeProjections),
      requiredActions: ['Monitor performance', 'Maintain current capacity'],
      estimatedCost: '€100-500/month'
    });

    // Realistic scenario (100% of projected growth)
    scenarios.push({
      name: 'Expected Growth',
      description: 'Growth continues at current projected rate',
      assumptions: [
        'Current growth trends continue',
        'Normal business operations',
        'Planned feature releases'
      ],
      projectedMetrics: this.buildScenarioMetrics(current, projections.map(p => ({
        ...p,
        projectedValue: p.projectedValues[timeframe]
      }))),
      requiredActions: this.getActiveRecommendations().slice(0, 3).map(r => r.title),
      estimatedCost: '€1000-3000/month'
    });

    // Aggressive scenario (150% of projected growth)
    const aggressiveProjections = projections.map(p => ({
      ...p,
      projectedValue: p.currentValue + ((p.projectedValues[timeframe] - p.currentValue) * 1.5)
    }));
    
    scenarios.push({
      name: 'Rapid Growth',
      description: '50% faster growth than projected - significant scaling needed',
      assumptions: [
        'Viral growth or major marketing success',
        'New product features drive adoption',
        'Competition drives user acquisition'
      ],
      projectedMetrics: this.buildScenarioMetrics(current, aggressiveProjections),
      requiredActions: [
        'Implement auto-scaling',
        'Deploy read replicas',
        'Expand infrastructure significantly'
      ],
      estimatedCost: '€3000-8000/month'
    });

    return scenarios;
  }

  private buildScenarioMetrics(
    current: CapacityMetrics, 
    projections: Array<{ metric: string; projectedValue: number }>
  ): CapacityMetrics {
    const scenario = { ...current };
    
    projections.forEach(projection => {
      switch (projection.metric) {
        case 'Database Size':
          scenario.database.size = projection.projectedValue;
          break;
        case 'Total Users':
          scenario.users.totalUsers = projection.projectedValue;
          scenario.users.activeUsers = Math.round(projection.projectedValue * 0.3);
          scenario.users.concurrentUsers = Math.round(projection.projectedValue * 0.05);
          break;
        case 'Connection Utilization':
          scenario.connections.utilizationRate = Math.min(95, projection.projectedValue);
          break;
      }
    });
    
    return scenario;
  }

  private determineOverallStatus(): CapacityPlan['summary']['overallStatus'] {
    const criticalThresholds = this.thresholds.filter(t => 
      t.currentValue > t.criticalThreshold || 
      (t.estimatedTimeToCritical && t.estimatedTimeToCritical < 30)
    );
    
    if (criticalThresholds.length > 0) {
      return 'critical';
    }
    
    const warningThresholds = this.thresholds.filter(t => 
      t.currentValue > t.warningThreshold ||
      (t.estimatedTimeToWarning && t.estimatedTimeToWarning < 60)
    );
    
    if (warningThresholds.length > 0) {
      return 'at_risk';
    }
    
    const approachingLimits = this.thresholds.filter(t => 
      t.currentValue > t.warningThreshold * 0.8 ||
      (t.estimatedTimeToWarning && t.estimatedTimeToWarning < 90)
    );
    
    if (approachingLimits.length > 0) {
      return 'approaching_limits';
    }
    
    return 'healthy';
  }

  private calculateTotalEstimatedCosts(recommendations: ScalingRecommendation[]): string {
    // Extract numeric values from cost strings and sum them up
    let minCost = 0;
    let maxCost = 0;
    
    recommendations.forEach(rec => {
      const matches = rec.estimatedCost.match(/€(\d+)-(\d+)/);
      if (matches) {
        minCost += parseInt(matches[1]);
        maxCost += parseInt(matches[2]);
      }
    });
    
    if (minCost === 0 && maxCost === 0) {
      return 'To be determined';
    }
    
    return `€${minCost}-${maxCost}/month`;
  }

  private async saveCapacityPlan(plan: CapacityPlan): Promise<void> {
    const planPath = join(this.outputPath, `capacity-plan-${plan.id}.json`);
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
    
    // Also save as latest plan
    const latestPath = join(this.outputPath, 'latest-capacity-plan.json');
    await fs.writeFile(latestPath, JSON.stringify(plan, null, 2));
    
    logger.info('Capacity plan saved', { planPath, planId: plan.id });
  }

  // Public API methods
  async getCurrentMetrics(): Promise<CapacityMetrics | null> {
    if (this.metrics.length === 0) {
      await this.collectCurrentMetrics();
    }
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(days: number = 30): CapacityMetrics[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  getThresholds(): CapacityThreshold[] {
    return [...this.thresholds];
  }

  async getQuickCapacityStatus(): Promise<{
    status: string;
    criticalIssues: string[];
    upcomingLimits: string[];
    nextReview: Date;
  }> {
    const currentMetrics = await this.getCurrentMetrics();
    if (!currentMetrics) {
      return {
        status: 'unknown',
        criticalIssues: ['No metrics available'],
        upcomingLimits: [],
        nextReview: new Date()
      };
    }

    const criticalIssues: string[] = [];
    const upcomingLimits: string[] = [];

    this.thresholds.forEach(threshold => {
      if (threshold.currentValue > threshold.criticalThreshold) {
        criticalIssues.push(`${threshold.metric} is at critical level`);
      } else if (threshold.currentValue > threshold.warningThreshold) {
        upcomingLimits.push(`${threshold.metric} approaching limit`);
      }
    });

    const status = this.determineOverallStatus();
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 7); // Next week

    return {
      status,
      criticalIssues,
      upcomingLimits,
      nextReview
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down capacity planning service...');

    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.debug(`Stopped scheduled task: ${name}`);
    });
    this.scheduledTasks.clear();

    logger.info('Capacity planning service shutdown completed');
  }
}

// Create and export singleton instance
export const capacityPlanningService = new CapacityPlanningService();

// Export types
export {
  CapacityMetrics,
  GrowthProjection,
  CapacityThreshold,
  ScalingRecommendation,
  CapacityPlan,
  CapacityScenario
};

export default capacityPlanningService;