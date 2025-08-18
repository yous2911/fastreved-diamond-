/**
 * Performance Benchmarking Service for RevEd Kids
 * Provides comprehensive database and application performance benchmarking
 */

import { connection, getPoolStats } from '../db/connection';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { optimizedQueries } from '../db/optimized-queries';

interface BenchmarkConfig {
  enabled: boolean;
  outputPath: string;
  iterations: number;
  warmupIterations: number;
  concurrentUsers: number[];
  testDataSizes: number[];
  timeoutMs: number;
  includeBaseline: boolean;
  generateReport: boolean;
}

interface BenchmarkSuite {
  id: string;
  name: string;
  description: string;
  category: 'database' | 'api' | 'computation' | 'memory' | 'network';
  tests: BenchmarkTest[];
}

interface BenchmarkTest {
  id: string;
  name: string;
  description: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  execute: () => Promise<any>;
  validate?: (result: any) => boolean;
  expectedRange?: {
    min: number;
    max: number;
    unit: 'ms' | 'qps' | 'mb' | 'cpu%';
  };
}

interface BenchmarkResult {
  testId: string;
  testName: string;
  category: string;
  results: TestExecution[];
  statistics: {
    mean: number;
    median: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
    stdDev: number;
    throughput?: number; // Operations per second
    errorRate: number;
  };
  metadata: {
    concurrency: number;
    dataSize: number;
    environment: string;
    timestamp: Date;
    systemInfo: SystemInfo;
  };
}

interface TestExecution {
  iteration: number;
  executionTime: number;
  success: boolean;
  error?: string;
  memoryUsed?: number;
  cpuUsed?: number;
  timestamp: Date;
}

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  cpuCount: number;
  totalMemory: number;
  freeMemory: number;
  databaseVersion?: string;
  redisVersion?: string;
}

interface BenchmarkReport {
  id: string;
  generatedAt: Date;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averagePerformance: number;
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  results: BenchmarkResult[];
  comparisons: PerformanceComparison[];
  recommendations: string[];
  systemInfo: SystemInfo;
}

interface PerformanceComparison {
  testId: string;
  testName: string;
  currentResult: number;
  baselineResult?: number;
  improvement: number; // Percentage
  status: 'improved' | 'degraded' | 'stable' | 'new';
}

class PerformanceBenchmarkService {
  private config: BenchmarkConfig;
  private suites: Map<string, BenchmarkSuite> = new Map();
  private results: Map<string, BenchmarkResult[]> = new Map();
  private baselines: Map<string, BenchmarkResult> = new Map();
  private isRunning = false;

  constructor() {
    this.config = {
      enabled: process.env.BENCHMARK_ENABLED !== 'false',
      outputPath: process.env.BENCHMARK_OUTPUT_PATH || join(process.cwd(), 'benchmark-results'),
      iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '10'),
      warmupIterations: parseInt(process.env.BENCHMARK_WARMUP_ITERATIONS || '3'),
      concurrentUsers: [1, 5, 10, 25, 50].map(n => 
        parseInt(process.env[`BENCHMARK_CONCURRENT_${n}`] || n.toString())
      ),
      testDataSizes: [100, 1000, 10000].map(n =>
        parseInt(process.env[`BENCHMARK_DATA_SIZE_${n}`] || n.toString())
      ),
      timeoutMs: parseInt(process.env.BENCHMARK_TIMEOUT || '30000'),
      includeBaseline: process.env.BENCHMARK_INCLUDE_BASELINE !== 'false',
      generateReport: process.env.BENCHMARK_GENERATE_REPORT !== 'false'
    };

    this.initializeBenchmarkSuites();
  }

  private initializeBenchmarkSuites(): void {
    // Database Performance Suite
    this.suites.set('database', {
      id: 'database',
      name: 'Database Performance',
      description: 'Comprehensive database operation benchmarks',
      category: 'database',
      tests: [
        {
          id: 'simple_select',
          name: 'Simple SELECT Query',
          description: 'Basic SELECT query performance',
          execute: async () => {
            const [rows] = await connection.execute('SELECT COUNT(*) as count FROM students');
            return rows;
          }
        },
        {
          id: 'complex_join',
          name: 'Complex JOIN Query',
          description: 'Multi-table JOIN with aggregation',
          execute: async () => {
            return await optimizedQueries.getStudentWithProgress(1);
          }
        },
        {
          id: 'insert_performance',
          name: 'INSERT Performance',
          description: 'Single INSERT operation speed',
          setup: async () => {
            await connection.execute('CREATE TEMPORARY TABLE benchmark_test (id INT AUTO_INCREMENT PRIMARY KEY, data VARCHAR(255))');
          },
          execute: async () => {
            const testData = `test-data-${Date.now()}-${Math.random()}`;
            const [result] = await connection.execute('INSERT INTO benchmark_test (data) VALUES (?)', [testData]);
            return result;
          },
          teardown: async () => {
            await connection.execute('DROP TEMPORARY TABLE IF EXISTS benchmark_test');
          }
        },
        {
          id: 'bulk_insert',
          name: 'Bulk INSERT Performance',
          description: 'Batch INSERT operation performance',
          setup: async () => {
            await connection.execute('CREATE TEMPORARY TABLE benchmark_bulk (id INT AUTO_INCREMENT PRIMARY KEY, data VARCHAR(255))');
          },
          execute: async () => {
            const values = Array.from({ length: 100 }, (_, i) => [`test-${i}-${Date.now()}`]);
            const placeholders = values.map(() => '(?)').join(',');
            const [result] = await connection.execute(
              `INSERT INTO benchmark_bulk (data) VALUES ${placeholders}`,
              values.flat()
            );
            return result;
          },
          teardown: async () => {
            await connection.execute('DROP TEMPORARY TABLE IF EXISTS benchmark_bulk');
          }
        },
        {
          id: 'update_performance',
          name: 'UPDATE Performance',
          description: 'UPDATE operation speed',
          setup: async () => {
            await connection.execute('CREATE TEMPORARY TABLE benchmark_update (id INT AUTO_INCREMENT PRIMARY KEY, data VARCHAR(255), counter INT DEFAULT 0)');
            await connection.execute('INSERT INTO benchmark_update (data) VALUES ("test-data")');
          },
          execute: async () => {
            const [result] = await connection.execute('UPDATE benchmark_update SET counter = counter + 1, data = ? WHERE id = 1', [`updated-${Date.now()}`]);
            return result;
          },
          teardown: async () => {
            await connection.execute('DROP TEMPORARY TABLE IF EXISTS benchmark_update');
          }
        },
        {
          id: 'delete_performance',
          name: 'DELETE Performance',
          description: 'DELETE operation speed',
          setup: async () => {
            await connection.execute('CREATE TEMPORARY TABLE benchmark_delete (id INT AUTO_INCREMENT PRIMARY KEY, data VARCHAR(255))');
            await connection.execute('INSERT INTO benchmark_delete (data) VALUES ("to-delete")');
          },
          execute: async () => {
            const [result] = await connection.execute('DELETE FROM benchmark_delete WHERE id = 1');
            await connection.execute('INSERT INTO benchmark_delete (data) VALUES ("to-delete")'); // Reset for next iteration
            return result;
          },
          teardown: async () => {
            await connection.execute('DROP TEMPORARY TABLE IF EXISTS benchmark_delete');
          }
        }
      ]
    });

    // Query Optimization Suite
    this.suites.set('query_optimization', {
      id: 'query_optimization',
      name: 'Query Optimization',
      description: 'Optimized query performance tests',
      category: 'database',
      tests: [
        {
          id: 'student_progress_optimized',
          name: 'Optimized Student Progress Query',
          description: 'Performance of optimized student progress retrieval',
          execute: async () => {
            return await optimizedQueries.getStudentWithProgress(1);
          },
          expectedRange: { min: 0, max: 100, unit: 'ms' }
        },
        {
          id: 'exercises_with_stats',
          name: 'Exercises with Statistics',
          description: 'Performance of exercise statistics aggregation',
          execute: async () => {
            return await optimizedQueries.getExercisesWithStats({ matiere: 'maths' }, { limit: 20 });
          },
          expectedRange: { min: 0, max: 200, unit: 'ms' }
        },
        {
          id: 'learning_analytics',
          name: 'Learning Analytics Query',
          description: 'Complex analytics query performance',
          execute: async () => {
            return await optimizedQueries.getLearningAnalytics();
          },
          expectedRange: { min: 0, max: 500, unit: 'ms' }
        },
        {
          id: 'recommended_exercises',
          name: 'Exercise Recommendations',
          description: 'AI-powered exercise recommendation performance',
          execute: async () => {
            return await optimizedQueries.getRecommendedExercises(1, 10);
          },
          expectedRange: { min: 0, max: 300, unit: 'ms' }
        }
      ]
    });

    // Connection Pool Suite
    this.suites.set('connection_pool', {
      id: 'connection_pool',
      name: 'Connection Pool Performance',
      description: 'Database connection pool efficiency tests',
      category: 'database',
      tests: [
        {
          id: 'pool_acquisition',
          name: 'Connection Pool Acquisition',
          description: 'Time to acquire connection from pool',
          execute: async () => {
            const start = Date.now();
            const conn = await connection.getConnection();
            const acquisitionTime = Date.now() - start;
            conn.release();
            return { acquisitionTime };
          },
          expectedRange: { min: 0, max: 50, unit: 'ms' }
        },
        {
          id: 'concurrent_connections',
          name: 'Concurrent Connection Handling',
          description: 'Multiple concurrent connection requests',
          execute: async () => {
            const promises = Array.from({ length: 10 }, async () => {
              const start = Date.now();
              const conn = await connection.getConnection();
              await conn.execute('SELECT 1');
              const executionTime = Date.now() - start;
              conn.release();
              return executionTime;
            });

            const results = await Promise.all(promises);
            return {
              avgTime: results.reduce((sum, time) => sum + time, 0) / results.length,
              maxTime: Math.max(...results),
              minTime: Math.min(...results)
            };
          }
        }
      ]
    });

    // Memory and CPU Suite
    this.suites.set('system_resources', {
      id: 'system_resources',
      name: 'System Resource Usage',
      description: 'Memory and CPU usage benchmarks',
      category: 'memory',
      tests: [
        {
          id: 'memory_usage_baseline',
          name: 'Memory Usage Baseline',
          description: 'Baseline memory consumption',
          execute: async () => {
            const memUsage = process.memoryUsage();
            return {
              rss: memUsage.rss,
              heapTotal: memUsage.heapTotal,
              heapUsed: memUsage.heapUsed,
              external: memUsage.external
            };
          }
        },
        {
          id: 'large_query_memory',
          name: 'Large Query Memory Impact',
          description: 'Memory usage during large result set queries',
          execute: async () => {
            const beforeMemory = process.memoryUsage();
            
            // Execute a query that returns a large dataset
            const [rows] = await connection.execute(`
              SELECT s.*, sp.* 
              FROM students s 
              LEFT JOIN student_progress sp ON s.id = sp.student_id 
              LIMIT 1000
            `);
            
            const afterMemory = process.memoryUsage();
            
            return {
              rowCount: (rows as any[]).length,
              memoryIncrease: afterMemory.heapUsed - beforeMemory.heapUsed,
              beforeHeapUsed: beforeMemory.heapUsed,
              afterHeapUsed: afterMemory.heapUsed
            };
          }
        }
      ]
    });
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Performance benchmarking disabled');
      return;
    }

    try {
      logger.info('Initializing performance benchmark service...');

      // Ensure output directory exists
      await fs.mkdir(this.config.outputPath, { recursive: true });

      // Load existing baselines if available
      await this.loadBaselines();

      logger.info('Performance benchmark service initialized', {
        suites: this.suites.size,
        outputPath: this.config.outputPath
      });

    } catch (error) {
      logger.error('Failed to initialize performance benchmark service', { error });
      throw error;
    }
  }

  private async loadBaselines(): Promise<void> {
    try {
      const baselinePath = join(this.config.outputPath, 'baselines.json');
      
      try {
        const content = await fs.readFile(baselinePath, 'utf8');
        const baselines = JSON.parse(content);
        
        for (const [testId, baseline] of Object.entries(baselines)) {
          this.baselines.set(testId, baseline as BenchmarkResult);
        }
        
        logger.info('Loaded performance baselines', { count: this.baselines.size });
      } catch (error) {
        logger.debug('No existing baselines found');
      }
    } catch (error) {
      logger.error('Failed to load baselines', { error });
    }
  }

  private async saveBaselines(): Promise<void> {
    try {
      const baselinePath = join(this.config.outputPath, 'baselines.json');
      const baselines = Object.fromEntries(this.baselines.entries());
      await fs.writeFile(baselinePath, JSON.stringify(baselines, null, 2));
      logger.info('Baselines saved', { count: this.baselines.size });
    } catch (error) {
      logger.error('Failed to save baselines', { error });
    }
  }

  async runBenchmark(
    suiteId?: string, 
    options: {
      concurrency?: number;
      dataSize?: number;
      iterations?: number;
      saveAsBaseline?: boolean;
    } = {}
  ): Promise<BenchmarkReport> {
    if (this.isRunning) {
      throw new Error('Benchmark is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting performance benchmark', {
        suiteId: suiteId || 'all',
        concurrency: options.concurrency || 1,
        iterations: options.iterations || this.config.iterations
      });

      const suitesToRun = suiteId ? [this.suites.get(suiteId)!] : Array.from(this.suites.values());
      const systemInfo = await this.getSystemInfo();
      const results: BenchmarkResult[] = [];

      for (const suite of suitesToRun) {
        if (!suite) continue;

        logger.info('Running benchmark suite', { suiteName: suite.name });

        for (const test of suite.tests) {
          try {
            const result = await this.runTest(test, suite.category, {
              concurrency: options.concurrency || 1,
              dataSize: options.dataSize || 1000,
              iterations: options.iterations || this.config.iterations,
              systemInfo
            });

            results.push(result);

            if (options.saveAsBaseline) {
              this.baselines.set(test.id, result);
            }

            // Store result history
            if (!this.results.has(test.id)) {
              this.results.set(test.id, []);
            }
            this.results.get(test.id)!.push(result);

          } catch (error) {
            logger.error('Benchmark test failed', {
              testId: test.id,
              error: error.message
            });
          }
        }
      }

      // Generate report
      const report = await this.generateReport(results, systemInfo);

      // Save results
      if (this.config.generateReport) {
        await this.saveReport(report);
      }

      if (options.saveAsBaseline) {
        await this.saveBaselines();
      }

      const totalTime = Date.now() - startTime;
      logger.info('Benchmark completed', {
        totalTests: results.length,
        totalTime,
        averagePerformance: report.summary.averagePerformance
      });

      return report;

    } finally {
      this.isRunning = false;
    }
  }

  private async runTest(
    test: BenchmarkTest,
    category: string,
    options: {
      concurrency: number;
      dataSize: number;
      iterations: number;
      systemInfo: SystemInfo;
    }
  ): Promise<BenchmarkResult> {
    const { concurrency, dataSize, iterations, systemInfo } = options;

    try {
      // Setup
      if (test.setup) {
        await test.setup();
      }

      // Warmup
      logger.debug('Warming up test', { testId: test.id });
      for (let i = 0; i < this.config.warmupIterations; i++) {
        try {
          await Promise.race([
            test.execute(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Warmup timeout')), this.config.timeoutMs)
            )
          ]);
        } catch (error) {
          // Ignore warmup errors
        }
      }

      // Actual benchmark
      logger.debug('Running benchmark test', { testId: test.id, iterations });
      const executions: TestExecution[] = [];

      for (let i = 0; i < iterations; i++) {
        const execution = await this.executeTestIteration(test, i);
        executions.push(execution);
      }

      // Calculate statistics
      const successfulExecutions = executions.filter(e => e.success);
      const executionTimes = successfulExecutions.map(e => e.executionTime);
      
      const statistics = this.calculateStatistics(executionTimes, executions.length);

      const result: BenchmarkResult = {
        testId: test.id,
        testName: test.name,
        category,
        results: executions,
        statistics,
        metadata: {
          concurrency,
          dataSize,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date(),
          systemInfo
        }
      };

      // Teardown
      if (test.teardown) {
        await test.teardown();
      }

      return result;

    } catch (error) {
      logger.error('Test execution failed', { testId: test.id, error });
      throw error;
    }
  }

  private async executeTestIteration(
    test: BenchmarkTest, 
    iteration: number
  ): Promise<TestExecution> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await Promise.race([
        test.execute(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), this.config.timeoutMs)
        )
      ]);

      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Validate result if validator provided
      const isValid = test.validate ? test.validate(result) : true;

      return {
        iteration,
        executionTime,
        success: isValid,
        memoryUsed,
        timestamp: new Date(),
        error: isValid ? undefined : 'Validation failed'
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        iteration,
        executionTime,
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  private calculateStatistics(
    executionTimes: number[], 
    totalExecutions: number
  ): BenchmarkResult['statistics'] {
    if (executionTimes.length === 0) {
      return {
        mean: 0, median: 0, min: 0, max: 0, p95: 0, p99: 0, stdDev: 0,
        errorRate: 100, throughput: 0
      };
    }

    const sorted = [...executionTimes].sort((a, b) => a - b);
    const mean = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    // Standard deviation
    const variance = executionTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / executionTimes.length;
    const stdDev = Math.sqrt(variance);

    const errorRate = ((totalExecutions - executionTimes.length) / totalExecutions) * 100;
    const throughput = mean > 0 ? 1000 / mean : 0; // Operations per second

    return {
      mean, median, min, max, p95, p99, stdDev, errorRate, throughput
    };
  }

  private async generateReport(
    results: BenchmarkResult[], 
    systemInfo: SystemInfo
  ): Promise<BenchmarkReport> {
    const passedTests = results.filter(r => r.statistics.errorRate < 10).length; // Less than 10% error rate
    const failedTests = results.length - passedTests;

    // Calculate average performance score
    const performanceScores = results.map(result => {
      const { mean, errorRate } = result.statistics;
      const test = this.findTest(result.testId);
      
      if (test?.expectedRange) {
        const { min, max } = test.expectedRange;
        if (mean <= max && errorRate < 5) {
          return mean <= min ? 100 : 100 - ((mean - min) / (max - min)) * 50;
        } else {
          return Math.max(0, 50 - errorRate);
        }
      }
      
      // Generic scoring based on response time and error rate
      const timeScore = Math.max(0, 100 - mean / 10); // 10ms = 1 point deduction
      const errorScore = Math.max(0, 100 - errorRate);
      return (timeScore + errorScore) / 2;
    });

    const averagePerformance = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;
    
    const performanceGrade = this.calculatePerformanceGrade(averagePerformance);

    // Generate comparisons with baselines
    const comparisons: PerformanceComparison[] = results.map(result => {
      const baseline = this.baselines.get(result.testId);
      const improvement = baseline ? 
        ((baseline.statistics.mean - result.statistics.mean) / baseline.statistics.mean) * 100 : 0;
      
      let status: PerformanceComparison['status'] = 'new';
      if (baseline) {
        if (Math.abs(improvement) < 5) status = 'stable';
        else if (improvement > 0) status = 'improved';
        else status = 'degraded';
      }

      return {
        testId: result.testId,
        testName: result.testName,
        currentResult: result.statistics.mean,
        baselineResult: baseline?.statistics.mean,
        improvement,
        status
      };
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, comparisons);

    const report: BenchmarkReport = {
      id: `benchmark-${Date.now()}`,
      generatedAt: new Date(),
      summary: {
        totalTests: results.length,
        passedTests,
        failedTests,
        averagePerformance,
        performanceGrade
      },
      results,
      comparisons,
      recommendations,
      systemInfo
    };

    return report;
  }

  private findTest(testId: string): BenchmarkTest | undefined {
    for (const suite of this.suites.values()) {
      const test = suite.tests.find(t => t.id === testId);
      if (test) return test;
    }
    return undefined;
  }

  private calculatePerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateRecommendations(
    results: BenchmarkResult[], 
    comparisons: PerformanceComparison[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze slow queries
    const slowQueries = results.filter(r => r.category === 'database' && r.statistics.mean > 1000);
    if (slowQueries.length > 0) {
      recommendations.push(
        `⚠️ ${slowQueries.length} database queries are taking longer than 1 second. Consider optimization.`
      );
    }

    // Analyze error rates
    const highErrorRates = results.filter(r => r.statistics.errorRate > 5);
    if (highErrorRates.length > 0) {
      recommendations.push(
        `🚨 ${highErrorRates.length} tests have error rates above 5%. Investigate connection issues.`
      );
    }

    // Analyze degraded performance
    const degradedTests = comparisons.filter(c => c.status === 'degraded');
    if (degradedTests.length > 0) {
      recommendations.push(
        `📉 ${degradedTests.length} tests show performance degradation compared to baseline.`
      );
    }

    // Memory recommendations
    const memoryIntensiveTests = results.filter(r => 
      r.results.some(exec => (exec.memoryUsed || 0) > 10 * 1024 * 1024) // 10MB
    );
    if (memoryIntensiveTests.length > 0) {
      recommendations.push(
        `💾 ${memoryIntensiveTests.length} tests are memory-intensive. Monitor for memory leaks.`
      );
    }

    // Connection pool recommendations
    const poolStats = getPoolStats();
    if (poolStats.totalConnections / (poolStats.activeConnections || 1) > 0.8) {
      recommendations.push(
        '🔗 Connection pool utilization is high. Consider increasing pool size.'
      );
    }

    // General recommendations
    const overallScore = results.reduce((sum, r) => sum + (r.statistics.throughput || 0), 0) / results.length;
    if (overallScore < 10) { // Less than 10 QPS average
      recommendations.push(
        '⚡ Overall throughput is low. Consider database indexing and query optimization.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance metrics look good! Continue monitoring regularly.');
    }

    return recommendations;
  }

  private async getSystemInfo(): Promise<SystemInfo> {
    const os = require('os');
    
    let databaseVersion = 'Unknown';
    try {
      const [rows] = await connection.execute('SELECT VERSION() as version');
      databaseVersion = (rows as any[])[0]?.version || 'Unknown';
    } catch (error) {
      // Ignore if can't get version
    }

    return {
      nodeVersion: process.version,
      platform: os.platform(),
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      databaseVersion
    };
  }

  private async saveReport(report: BenchmarkReport): Promise<void> {
    const reportPath = join(this.config.outputPath, `benchmark-report-${report.id}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    logger.info('Benchmark report saved', { reportPath });
  }

  // Public API methods
  async runQuickBenchmark(): Promise<BenchmarkReport> {
    return this.runBenchmark(undefined, { iterations: 5 });
  }

  async runDatabaseBenchmark(): Promise<BenchmarkReport> {
    return this.runBenchmark('database');
  }

  async setBaseline(): Promise<void> {
    await this.runBenchmark(undefined, { 
      saveAsBaseline: true,
      iterations: this.config.iterations 
    });
    logger.info('New performance baseline established');
  }

  getResults(testId?: string): BenchmarkResult[] {
    if (testId) {
      return this.results.get(testId) || [];
    }
    
    const allResults: BenchmarkResult[] = [];
    for (const results of this.results.values()) {
      allResults.push(...results);
    }
    return allResults;
  }

  getBaselines(): Map<string, BenchmarkResult> {
    return new Map(this.baselines);
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  getSuites(): BenchmarkSuite[] {
    return Array.from(this.suites.values());
  }
}

// Create and export singleton instance
export const performanceBenchmarkService = new PerformanceBenchmarkService();

// Export types
export {
  BenchmarkConfig,
  BenchmarkSuite,
  BenchmarkTest,
  BenchmarkResult,
  BenchmarkReport,
  PerformanceComparison,
  SystemInfo
};

export default performanceBenchmarkService;