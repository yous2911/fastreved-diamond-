/**
 * Slow Query Logging and Optimization Service for RevEd Kids
 * Provides automatic detection, analysis, and optimization of slow database queries
 */

import { connection } from '../db/connection';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import cron from 'node-cron';

interface SlowQueryConfig {
  enabled: boolean;
  logThreshold: number; // seconds
  analyzeEnabled: boolean;
  optimizeEnabled: boolean;
  logFilePath: string;
  retentionDays: number;
  maxLogSize: number; // MB
  alertThreshold: number; // queries per hour
}

interface SlowQueryEntry {
  id: string;
  timestamp: Date;
  queryTime: number;
  lockTime: number;
  rowsExamined: number;
  rowsSent: number;
  query: string;
  normalizedQuery: string;
  database: string;
  user: string;
  host: string;
  thread: number;
  fingerprint: string;
}

interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  explanation: string;
  expectedImprovement: string;
  indexSuggestions: string[];
  rewriteSuggestions: string[];
  confidence: 'low' | 'medium' | 'high';
}

interface QueryPerformanceStats {
  queryFingerprint: string;
  normalizedQuery: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  avgRowsExamined: number;
  avgRowsSent: number;
  firstSeen: Date;
  lastSeen: Date;
  frequency: number; // queries per hour
}

interface IndexRecommendation {
  tableName: string;
  columns: string[];
  indexType: 'BTREE' | 'HASH' | 'FULLTEXT';
  reason: string;
  estimatedImprovement: string;
  createStatement: string;
  priority: 'high' | 'medium' | 'low';
}

class SlowQueryOptimizerService {
  private config: SlowQueryConfig;
  private slowQueries: SlowQueryEntry[] = [];
  private queryStats = new Map<string, QueryPerformanceStats>();
  private optimizations = new Map<string, QueryOptimization>();
  private indexRecommendations: IndexRecommendation[] = [];
  private isInitialized = false;
  private scheduledTasks = new Map<string, cron.ScheduledTask>();

  constructor() {
    this.config = {
      enabled: process.env.SLOW_QUERY_ENABLED !== 'false',
      logThreshold: parseFloat(process.env.SLOW_QUERY_THRESHOLD || '1.0'), // 1 second
      analyzeEnabled: process.env.SLOW_QUERY_ANALYZE !== 'false',
      optimizeEnabled: process.env.SLOW_QUERY_OPTIMIZE !== 'false',
      logFilePath: process.env.SLOW_QUERY_LOG_PATH || join(process.cwd(), 'logs', 'slow-queries.log'),
      retentionDays: parseInt(process.env.SLOW_QUERY_RETENTION_DAYS || '7'),
      maxLogSize: parseInt(process.env.SLOW_QUERY_MAX_LOG_SIZE || '100'), // 100MB
      alertThreshold: parseInt(process.env.SLOW_QUERY_ALERT_THRESHOLD || '10') // 10 queries per hour
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Slow query optimization disabled');
      return;
    }

    try {
      logger.info('Initializing slow query optimizer service...', {
        threshold: this.config.logThreshold,
        analyzeEnabled: this.config.analyzeEnabled,
        optimizeEnabled: this.config.optimizeEnabled
      });

      // Configure MySQL slow query logging
      await this.configureMySQLSlowQueryLog();

      // Setup log directory
      await this.setupLogDirectory();

      // Load existing slow queries if available
      await this.loadExistingSlowQueries();

      // Setup scheduled tasks
      this.setupScheduledTasks();

      // Enable performance schema if available
      await this.enablePerformanceSchema();

      this.isInitialized = true;
      logger.info('Slow query optimizer service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize slow query optimizer service', { error });
      throw error;
    }
  }

  private async configureMySQLSlowQueryLog(): Promise<void> {
    try {
      // Enable slow query logging
      await connection.execute('SET GLOBAL slow_query_log = ?', ['ON']);
      
      // Set threshold
      await connection.execute('SET GLOBAL long_query_time = ?', [this.config.logThreshold]);
      
      // Log queries not using indexes
      await connection.execute('SET GLOBAL log_queries_not_using_indexes = ?', ['ON']);
      
      // Log admin statements
      await connection.execute('SET GLOBAL log_slow_admin_statements = ?', ['ON']);
      
      // Set minimum examined row threshold
      await connection.execute('SET GLOBAL min_examined_row_limit = ?', [100]);

      logger.info('MySQL slow query logging configured', {
        threshold: this.config.logThreshold,
        logQueriesNotUsingIndexes: true
      });
    } catch (error) {
      logger.warn('Could not configure MySQL slow query logging - insufficient privileges', { error });
    }
  }

  private async setupLogDirectory(): Promise<void> {
    const logDir = require('path').dirname(this.config.logFilePath);
    await fs.mkdir(logDir, { recursive: true });
  }

  private async loadExistingSlowQueries(): Promise<void> {
    try {
      // Load from performance_schema if available
      const [rows] = await connection.execute(`
        SELECT 
          DIGEST_TEXT as query,
          COUNT_STAR as count,
          SUM_TIMER_WAIT/1000000000000 as total_time,
          AVG_TIMER_WAIT/1000000000000 as avg_time,
          MIN_TIMER_WAIT/1000000000000 as min_time,
          MAX_TIMER_WAIT/1000000000000 as max_time,
          SUM_ROWS_EXAMINED as total_rows_examined,
          SUM_ROWS_SENT as total_rows_sent,
          FIRST_SEEN,
          LAST_SEEN
        FROM performance_schema.events_statements_summary_by_digest
        WHERE AVG_TIMER_WAIT/1000000000000 > ?
        ORDER BY AVG_TIMER_WAIT DESC
        LIMIT 100
      `, [this.config.logThreshold]);

      for (const row of rows as any[]) {
        const fingerprint = this.generateQueryFingerprint(row.query);
        
        const stats: QueryPerformanceStats = {
          queryFingerprint: fingerprint,
          normalizedQuery: this.normalizeQuery(row.query),
          count: row.count,
          totalTime: row.total_time,
          avgTime: row.avg_time,
          minTime: row.min_time,
          maxTime: row.max_time,
          avgRowsExamined: row.total_rows_examined / row.count,
          avgRowsSent: row.total_rows_sent / row.count,
          firstSeen: new Date(row.FIRST_SEEN),
          lastSeen: new Date(row.LAST_SEEN),
          frequency: this.calculateFrequency(row.count, row.FIRST_SEEN, row.LAST_SEEN)
        };

        this.queryStats.set(fingerprint, stats);
      }

      logger.info('Loaded existing slow queries from performance schema', {
        queriesLoaded: this.queryStats.size
      });
    } catch (error) {
      logger.debug('Could not load from performance schema', { error: error.message });
    }
  }

  private async enablePerformanceSchema(): Promise<void> {
    try {
      // Enable statement instrumentation
      await connection.execute(`
        UPDATE performance_schema.setup_instruments 
        SET ENABLED = 'YES', TIMED = 'YES' 
        WHERE NAME LIKE 'statement/%'
      `);

      // Enable consumers
      await connection.execute(`
        UPDATE performance_schema.setup_consumers 
        SET ENABLED = 'YES' 
        WHERE NAME IN (
          'events_statements_current',
          'events_statements_history',
          'events_statements_history_long',
          'events_statements_summary_by_digest'
        )
      `);

      logger.info('Performance Schema enabled for statement monitoring');
    } catch (error) {
      logger.debug('Could not configure Performance Schema', { error: error.message });
    }
  }

  private setupScheduledTasks(): void {
    // Analyze slow queries every hour
    const analyzeTask = cron.schedule('0 * * * *', async () => {
      try {
        await this.analyzeSlowQueries();
      } catch (error) {
        logger.error('Scheduled slow query analysis failed', { error });
      }
    }, { scheduled: true, name: 'slow-query-analysis' });

    // Generate optimization recommendations daily
    const optimizeTask = cron.schedule('0 2 * * *', async () => {
      try {
        await this.generateOptimizationRecommendations();
      } catch (error) {
        logger.error('Scheduled optimization generation failed', { error });
      }
    }, { scheduled: true, name: 'optimization-recommendations' });

    // Clean up old logs daily
    const cleanupTask = cron.schedule('0 1 * * *', async () => {
      try {
        await this.cleanupOldLogs();
      } catch (error) {
        logger.error('Scheduled log cleanup failed', { error });
      }
    }, { scheduled: true, name: 'log-cleanup' });

    this.scheduledTasks.set('analyze', analyzeTask);
    this.scheduledTasks.set('optimize', optimizeTask);
    this.scheduledTasks.set('cleanup', cleanupTask);

    logger.info('Slow query optimizer scheduled tasks configured');
  }

  async analyzeSlowQueries(): Promise<void> {
    if (!this.config.analyzeEnabled) return;

    try {
      logger.info('Starting slow query analysis...');

      // Get recent slow queries from performance schema
      const recentQueries = await this.getRecentSlowQueries();
      
      // Update statistics
      for (const query of recentQueries) {
        this.updateQueryStatistics(query);
      }

      // Identify problematic patterns
      const problematicQueries = this.identifyProblematicQueries();
      
      // Generate alerts for frequent slow queries
      await this.checkForAlerts();

      logger.info('Slow query analysis completed', {
        totalQueries: this.queryStats.size,
        problematicQueries: problematicQueries.length,
        recentQueries: recentQueries.length
      });

    } catch (error) {
      logger.error('Slow query analysis failed', { error });
    }
  }

  private async getRecentSlowQueries(): Promise<SlowQueryEntry[]> {
    try {
      const [rows] = await connection.execute(`
        SELECT 
          SQL_TEXT as query,
          TIMER_WAIT/1000000000000 as query_time,
          LOCK_TIME/1000000000000 as lock_time,
          ROWS_EXAMINED,
          ROWS_SENT,
          EVENT_ID,
          THREAD_ID,
          PROCESSLIST_USER as user,
          PROCESSLIST_HOST as host,
          CURRENT_SCHEMA as database_name,
          TIMER_START
        FROM performance_schema.events_statements_history_long
        WHERE TIMER_WAIT/1000000000000 > ?
        AND TIMER_START > (SELECT UNIX_TIMESTAMP(NOW() - INTERVAL 1 HOUR) * 1000000000000)
        ORDER BY TIMER_WAIT DESC
        LIMIT 50
      `, [this.config.logThreshold]);

      return (rows as any[]).map(row => ({
        id: `${row.EVENT_ID}-${row.THREAD_ID}`,
        timestamp: new Date(row.TIMER_START / 1000000),
        queryTime: row.query_time,
        lockTime: row.lock_time,
        rowsExamined: row.ROWS_EXAMINED,
        rowsSent: row.ROWS_SENT,
        query: row.query,
        normalizedQuery: this.normalizeQuery(row.query),
        database: row.database_name || '',
        user: row.user || '',
        host: row.host || '',
        thread: row.THREAD_ID,
        fingerprint: this.generateQueryFingerprint(row.query)
      }));
    } catch (error) {
      logger.debug('Could not get recent slow queries from performance schema', { error });
      return [];
    }
  }

  private normalizeQuery(query: string): string {
    if (!query) return '';
    
    return query
      // Replace string literals
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      // Replace numbers
      .replace(/\b\d+\b/g, '?')
      // Replace IN clauses with multiple values
      .replace(/IN\s*\([^)]+\)/gi, 'IN (?)')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private generateQueryFingerprint(query: string): string {
    const normalized = this.normalizeQuery(query);
    const crypto = require('crypto');
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 16);
  }

  private calculateFrequency(count: number, firstSeen: Date, lastSeen: Date): number {
    const timeSpanHours = (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60);
    return timeSpanHours > 0 ? count / timeSpanHours : 0;
  }

  private updateQueryStatistics(query: SlowQueryEntry): void {
    const existing = this.queryStats.get(query.fingerprint);
    
    if (existing) {
      existing.count++;
      existing.totalTime += query.queryTime;
      existing.avgTime = existing.totalTime / existing.count;
      existing.minTime = Math.min(existing.minTime, query.queryTime);
      existing.maxTime = Math.max(existing.maxTime, query.queryTime);
      existing.avgRowsExamined = (existing.avgRowsExamined * (existing.count - 1) + query.rowsExamined) / existing.count;
      existing.avgRowsSent = (existing.avgRowsSent * (existing.count - 1) + query.rowsSent) / existing.count;
      existing.lastSeen = query.timestamp;
      existing.frequency = this.calculateFrequency(existing.count, existing.firstSeen, existing.lastSeen);
    } else {
      const stats: QueryPerformanceStats = {
        queryFingerprint: query.fingerprint,
        normalizedQuery: query.normalizedQuery,
        count: 1,
        totalTime: query.queryTime,
        avgTime: query.queryTime,
        minTime: query.queryTime,
        maxTime: query.queryTime,
        avgRowsExamined: query.rowsExamined,
        avgRowsSent: query.rowsSent,
        firstSeen: query.timestamp,
        lastSeen: query.timestamp,
        frequency: 0
      };
      
      this.queryStats.set(query.fingerprint, stats);
    }
  }

  private identifyProblematicQueries(): QueryPerformanceStats[] {
    const problematic: QueryPerformanceStats[] = [];
    
    for (const stats of this.queryStats.values()) {
      // Identify queries that are:
      // 1. Frequently executed slow queries
      // 2. Very slow queries (even if infrequent)
      // 3. Queries examining many rows
      
      if (
        (stats.frequency > 1 && stats.avgTime > this.config.logThreshold) ||
        stats.avgTime > this.config.logThreshold * 5 ||
        stats.avgRowsExamined > 10000
      ) {
        problematic.push(stats);
      }
    }
    
    return problematic.sort((a, b) => 
      (b.frequency * b.avgTime) - (a.frequency * a.avgTime)
    );
  }

  private async checkForAlerts(): Promise<void> {
    const recentHour = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const stats of this.queryStats.values()) {
      if (stats.lastSeen > recentHour && stats.frequency > this.config.alertThreshold) {
        logger.warn('Frequent slow query detected', {
          queryFingerprint: stats.queryFingerprint,
          frequency: stats.frequency,
          avgTime: stats.avgTime,
          normalizedQuery: stats.normalizedQuery.substring(0, 100)
        });
      }
    }
  }

  async generateOptimizationRecommendations(): Promise<void> {
    if (!this.config.optimizeEnabled) return;

    try {
      logger.info('Generating optimization recommendations...');

      const problematicQueries = this.identifyProblematicQueries();
      
      for (const queryStats of problematicQueries.slice(0, 10)) { // Top 10 most problematic
        await this.analyzeAndOptimizeQuery(queryStats);
      }

      // Generate index recommendations
      await this.generateIndexRecommendations();

      logger.info('Optimization recommendations generated', {
        queryOptimizations: this.optimizations.size,
        indexRecommendations: this.indexRecommendations.length
      });

    } catch (error) {
      logger.error('Failed to generate optimization recommendations', { error });
    }
  }

  private async analyzeAndOptimizeQuery(stats: QueryPerformanceStats): Promise<void> {
    try {
      // Get execution plan
      const executionPlan = await this.getQueryExecutionPlan(stats.normalizedQuery);
      
      // Analyze query structure
      const optimization = this.generateQueryOptimization(stats, executionPlan);
      
      if (optimization) {
        this.optimizations.set(stats.queryFingerprint, optimization);
      }
    } catch (error) {
      logger.debug('Could not analyze query for optimization', {
        fingerprint: stats.queryFingerprint,
        error: error.message
      });
    }
  }

  private async getQueryExecutionPlan(query: string): Promise<any[]> {
    try {
      const [rows] = await connection.execute(`EXPLAIN FORMAT=JSON ${query}`);
      return rows as any[];
    } catch (error) {
      // Try simple EXPLAIN if JSON format fails
      try {
        const [rows] = await connection.execute(`EXPLAIN ${query}`);
        return rows as any[];
      } catch (fallbackError) {
        return [];
      }
    }
  }

  private generateQueryOptimization(stats: QueryPerformanceStats, executionPlan: any[]): QueryOptimization | null {
    const suggestions: string[] = [];
    const indexSuggestions: string[] = [];
    
    // Analyze common slow query patterns
    const query = stats.normalizedQuery;
    
    // Pattern 1: Missing WHERE clause
    if (query.includes('select') && !query.includes('where') && !query.includes('limit')) {
      suggestions.push('Add WHERE clause to filter results');
    }
    
    // Pattern 2: No LIMIT on potentially large result sets
    if (query.includes('select') && !query.includes('limit') && stats.avgRowsSent > 1000) {
      suggestions.push('Add LIMIT clause to restrict result set size');
    }
    
    // Pattern 3: Using SELECT *
    if (query.includes('select *')) {
      suggestions.push('Replace SELECT * with specific column names');
    }
    
    // Pattern 4: N+1 query pattern detection
    if (stats.frequency > 10 && stats.avgTime < 0.1) {
      suggestions.push('Potential N+1 query - consider JOIN or batch loading');
    }
    
    // Pattern 5: High rows examined vs rows sent ratio
    if (stats.avgRowsExamined / Math.max(stats.avgRowsSent, 1) > 100) {
      indexSuggestions.push('Add index to reduce rows examined');
    }
    
    if (suggestions.length > 0 || indexSuggestions.length > 0) {
      return {
        originalQuery: query,
        optimizedQuery: this.generateOptimizedQuery(query, suggestions),
        explanation: suggestions.join('; '),
        expectedImprovement: this.estimateImprovement(stats, suggestions.length),
        indexSuggestions,
        rewriteSuggestions: suggestions,
        confidence: this.calculateOptimizationConfidence(suggestions, indexSuggestions)
      };
    }
    
    return null;
  }

  private generateOptimizedQuery(originalQuery: string, suggestions: string[]): string {
    let optimized = originalQuery;
    
    // Apply basic optimizations
    if (suggestions.some(s => s.includes('SELECT *'))) {
      // This would require more sophisticated query parsing in a real implementation
      optimized = optimized.replace('select *', 'SELECT specific_columns');
    }
    
    if (suggestions.some(s => s.includes('LIMIT'))) {
      if (!optimized.includes('limit')) {
        optimized += ' LIMIT 1000';
      }
    }
    
    return optimized;
  }

  private estimateImprovement(stats: QueryPerformanceStats, suggestionCount: number): string {
    const improvementFactor = Math.min(suggestionCount * 0.3, 0.8);
    const estimatedTime = stats.avgTime * (1 - improvementFactor);
    const improvementPercent = ((stats.avgTime - estimatedTime) / stats.avgTime) * 100;
    
    return `Estimated ${improvementPercent.toFixed(1)}% improvement (${estimatedTime.toFixed(3)}s avg)`;
  }

  private calculateOptimizationConfidence(rewriteSuggestions: string[], indexSuggestions: string[]): 'low' | 'medium' | 'high' {
    const totalSuggestions = rewriteSuggestions.length + indexSuggestions.length;
    
    if (totalSuggestions >= 3) return 'high';
    if (totalSuggestions >= 2) return 'medium';
    return 'low';
  }

  private async generateIndexRecommendations(): Promise<void> {
    try {
      // Analyze tables with high scan ratios
      const [rows] = await connection.execute(`
        SELECT 
          table_schema,
          table_name,
          table_rows,
          data_length,
          index_length,
          (data_length / NULLIF(index_length, 0)) as scan_ratio
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
        AND table_rows > 1000
        HAVING scan_ratio > 10
        ORDER BY scan_ratio DESC
        LIMIT 10
      `);

      for (const table of rows as any[]) {
        const recommendation = await this.analyzeTableIndexNeeds(table.table_name);
        if (recommendation) {
          this.indexRecommendations.push(recommendation);
        }
      }
    } catch (error) {
      logger.error('Failed to generate index recommendations', { error });
    }
  }

  private async analyzeTableIndexNeeds(tableName: string): Promise<IndexRecommendation | null> {
    try {
      // Get existing indexes
      const [indexes] = await connection.execute(`
        SHOW INDEXES FROM ${tableName}
      `);

      // Analyze slow queries affecting this table
      const tableQueries = Array.from(this.queryStats.values())
        .filter(stats => stats.normalizedQuery.includes(tableName.toLowerCase()));

      if (tableQueries.length > 0) {
        // Simple heuristic: recommend index on commonly filtered columns
        const commonColumns = this.extractCommonFilterColumns(tableQueries, tableName);
        
        if (commonColumns.length > 0) {
          return {
            tableName,
            columns: commonColumns,
            indexType: 'BTREE',
            reason: 'Frequently filtered columns in slow queries',
            estimatedImprovement: 'Up to 80% query time reduction',
            createStatement: `CREATE INDEX idx_${tableName}_${commonColumns.join('_')} ON ${tableName} (${commonColumns.join(', ')})`,
            priority: 'high'
          };
        }
      }
    } catch (error) {
      logger.debug('Could not analyze index needs for table', { tableName, error });
    }
    
    return null;
  }

  private extractCommonFilterColumns(queries: QueryPerformanceStats[], tableName: string): string[] {
    // Simplified column extraction - in production, use proper SQL parsing
    const columnCounts = new Map<string, number>();
    
    queries.forEach(query => {
      // Look for WHERE clauses
      const whereMatch = query.normalizedQuery.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        // Extract column names (simplified)
        const columns = whereClause.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        columns.forEach(col => {
          if (col !== 'and' && col !== 'or' && col !== 'in' && col !== 'like') {
            columnCounts.set(col, (columnCounts.get(col) || 0) + 1);
          }
        });
      }
    });
    
    // Return most frequently filtered columns
    return Array.from(columnCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      // Remove old query statistics
      const beforeCount = this.queryStats.size;
      for (const [key, stats] of this.queryStats.entries()) {
        if (stats.lastSeen < cutoffDate) {
          this.queryStats.delete(key);
        }
      }

      const removedCount = beforeCount - this.queryStats.size;
      
      if (removedCount > 0) {
        logger.info('Old slow query statistics cleaned up', {
          removedCount,
          retentionDays: this.config.retentionDays
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old logs', { error });
    }
  }

  // Public API methods
  async getSlowQueryStats(): Promise<QueryPerformanceStats[]> {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.avgTime - a.avgTime);
  }

  async getOptimizationRecommendations(): Promise<QueryOptimization[]> {
    return Array.from(this.optimizations.values());
  }

  async getIndexRecommendations(): Promise<IndexRecommendation[]> {
    return [...this.indexRecommendations];
  }

  async getTopSlowQueries(limit: number = 10): Promise<QueryPerformanceStats[]> {
    return Array.from(this.queryStats.values())
      .sort((a, b) => (b.frequency * b.avgTime) - (a.frequency * a.avgTime))
      .slice(0, limit);
  }

  async runQueryOptimizationReport(): Promise<{
    summary: {
      totalSlowQueries: number;
      averageQueryTime: number;
      mostProblematicQuery: string;
      recommendationsGenerated: number;
    };
    topSlowQueries: QueryPerformanceStats[];
    optimizations: QueryOptimization[];
    indexRecommendations: IndexRecommendation[];
  }> {
    const topSlowQueries = await this.getTopSlowQueries(10);
    const optimizations = await this.getOptimizationRecommendations();
    const indexRecommendations = await this.getIndexRecommendations();

    const totalTime = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.totalTime, 0);
    const totalQueries = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.count, 0);

    return {
      summary: {
        totalSlowQueries: this.queryStats.size,
        averageQueryTime: totalQueries > 0 ? totalTime / totalQueries : 0,
        mostProblematicQuery: topSlowQueries[0]?.normalizedQuery || 'None',
        recommendationsGenerated: optimizations.length + indexRecommendations.length
      },
      topSlowQueries,
      optimizations,
      indexRecommendations
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down slow query optimizer service...');

    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.debug(`Stopped scheduled task: ${name}`);
    });
    this.scheduledTasks.clear();

    logger.info('Slow query optimizer service shutdown completed');
  }
}

// Create and export singleton instance
export const slowQueryOptimizerService = new SlowQueryOptimizerService();

// Export types
export {
  SlowQueryEntry,
  QueryOptimization,
  QueryPerformanceStats,
  IndexRecommendation,
  SlowQueryConfig
};

export default slowQueryOptimizerService;