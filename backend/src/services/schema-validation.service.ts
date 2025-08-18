/**
 * Database Schema Validation Service for RevEd Kids
 * Provides comprehensive schema validation, drift detection, and consistency checks
 */

import { connection } from '../db/connection';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import cron from 'node-cron';

interface SchemaDefinition {
  version: string;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  triggers: TriggerDefinition[];
  procedures: ProcedureDefinition[];
  metadata: {
    createdAt: Date;
    description: string;
    author: string;
  };
}

interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string[];
  engine: string;
  charset: string;
  collation: string;
  comment?: string;
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement: boolean;
  comment?: string;
  extra?: string;
}

interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  type: 'UNIQUE' | 'INDEX' | 'FULLTEXT' | 'SPATIAL';
  method?: 'BTREE' | 'HASH';
}

interface ConstraintDefinition {
  name: string;
  tableName: string;
  type: 'FOREIGN KEY' | 'CHECK' | 'UNIQUE';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

interface TriggerDefinition {
  name: string;
  tableName: string;
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
}

interface ProcedureDefinition {
  name: string;
  parameters: ParameterDefinition[];
  body: string;
  returnType?: string;
  comment?: string;
}

interface ParameterDefinition {
  name: string;
  type: string;
  direction: 'IN' | 'OUT' | 'INOUT';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    tablesChecked: number;
    indexesChecked: number;
    constraintsChecked: number;
    errorsFound: number;
    warningsFound: number;
  };
  executionTime: number;
}

interface ValidationError {
  type: 'MISSING_TABLE' | 'MISSING_COLUMN' | 'TYPE_MISMATCH' | 'MISSING_INDEX' | 
        'MISSING_CONSTRAINT' | 'INVALID_CONSTRAINT' | 'MISSING_TRIGGER' | 
        'MISSING_PROCEDURE' | 'SYNTAX_ERROR';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  table?: string;
  column?: string;
  expected?: any;
  actual?: any;
  suggestedFix?: string;
}

interface ValidationWarning {
  type: 'DEPRECATED_TYPE' | 'PERFORMANCE_CONCERN' | 'NAMING_CONVENTION' | 
        'UNUSED_INDEX' | 'LARGE_TABLE' | 'MISSING_DOCUMENTATION';
  message: string;
  table?: string;
  column?: string;
  suggestion?: string;
}

interface SchemaDrift {
  tableName: string;
  driftType: 'COLUMN_ADDED' | 'COLUMN_REMOVED' | 'COLUMN_MODIFIED' | 
            'INDEX_ADDED' | 'INDEX_REMOVED' | 'CONSTRAINT_MODIFIED';
  description: string;
  detectedAt: Date;
  severity: 'info' | 'warning' | 'error';
}

class SchemaValidationService {
  private expectedSchema: SchemaDefinition | null = null;
  private currentSchema: SchemaDefinition | null = null;
  private schemaPath: string;
  private validationHistory: ValidationResult[] = [];
  private driftHistory: SchemaDrift[] = [];
  private scheduledTasks = new Map<string, cron.ScheduledTask>();
  private isInitialized = false;

  constructor() {
    this.schemaPath = process.env.SCHEMA_DEFINITION_PATH || 
                     join(process.cwd(), 'backend', 'src', 'db', 'schema-definition.json');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing schema validation service...');

      // Load expected schema definition
      await this.loadExpectedSchema();

      // Generate current schema if not exists
      await this.generateCurrentSchema();

      // Setup scheduled validation
      this.setupScheduledValidation();

      // Setup drift monitoring
      this.setupDriftMonitoring();

      this.isInitialized = true;
      logger.info('Schema validation service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize schema validation service', { error });
      throw error;
    }
  }

  private async loadExpectedSchema(): Promise<void> {
    try {
      if (await this.fileExists(this.schemaPath)) {
        const content = await fs.readFile(this.schemaPath, 'utf8');
        this.expectedSchema = JSON.parse(content);
        logger.info('Expected schema loaded', {
          version: this.expectedSchema?.version,
          tables: this.expectedSchema?.tables.length
        });
      } else {
        logger.warn('Schema definition file not found, generating from current database...');
        await this.generateSchemaDefinition();
      }
    } catch (error) {
      logger.error('Failed to load expected schema', { error });
      throw error;
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async generateSchemaDefinition(): Promise<void> {
    try {
      logger.info('Generating schema definition from current database...');

      const schema: SchemaDefinition = {
        version: '1.0.0',
        tables: await this.extractTables(),
        indexes: await this.extractIndexes(),
        constraints: await this.extractConstraints(),
        triggers: await this.extractTriggers(),
        procedures: await this.extractProcedures(),
        metadata: {
          createdAt: new Date(),
          description: 'Auto-generated schema definition for RevEd Kids database',
          author: 'Schema Validation Service'
        }
      };

      // Save schema definition
      await this.ensureDirectoryExists(this.schemaPath);
      await fs.writeFile(this.schemaPath, JSON.stringify(schema, null, 2));

      this.expectedSchema = schema;
      logger.info('Schema definition generated and saved', {
        version: schema.version,
        tables: schema.tables.length,
        indexes: schema.indexes.length
      });

    } catch (error) {
      logger.error('Failed to generate schema definition', { error });
      throw error;
    }
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = require('path').dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async extractTables(): Promise<TableDefinition[]> {
    const tables: TableDefinition[] = [];

    // Get all tables
    const [tableRows] = await connection.execute(`
      SELECT 
        TABLE_NAME, 
        ENGINE, 
        TABLE_COLLATION,
        TABLE_COMMENT
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    for (const tableRow of tableRows as any[]) {
      const tableName = tableRow.TABLE_NAME;
      
      // Get columns for this table
      const columns = await this.extractTableColumns(tableName);
      
      // Get primary key
      const primaryKey = await this.extractPrimaryKey(tableName);

      const charset = tableRow.TABLE_COLLATION?.split('_')[0] || 'utf8mb4';

      tables.push({
        name: tableName,
        columns,
        primaryKey,
        engine: tableRow.ENGINE || 'InnoDB',
        charset,
        collation: tableRow.TABLE_COLLATION || 'utf8mb4_unicode_ci',
        comment: tableRow.TABLE_COMMENT || undefined
      });
    }

    return tables;
  }

  private async extractTableColumns(tableName: string): Promise<ColumnDefinition[]> {
    const [columnRows] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        EXTRA,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    return (columnRows as any[]).map(row => ({
      name: row.COLUMN_NAME,
      type: row.COLUMN_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      autoIncrement: row.EXTRA.includes('auto_increment'),
      comment: row.COLUMN_COMMENT || undefined,
      extra: row.EXTRA || undefined
    }));
  }

  private async extractPrimaryKey(tableName: string): Promise<string[]> {
    const [pkRows] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = 'PRIMARY'
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    return (pkRows as any[]).map(row => row.COLUMN_NAME);
  }

  private async extractIndexes(): Promise<IndexDefinition[]> {
    const indexes: IndexDefinition[] = [];
    const indexMap = new Map<string, IndexDefinition>();

    const [indexRows] = await connection.execute(`
      SELECT 
        INDEX_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        INDEX_TYPE,
        SEQ_IN_INDEX
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND INDEX_NAME != 'PRIMARY'
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `);

    for (const row of indexRows as any[]) {
      const key = `${row.TABLE_NAME}.${row.INDEX_NAME}`;
      
      if (!indexMap.has(key)) {
        indexMap.set(key, {
          name: row.INDEX_NAME,
          tableName: row.TABLE_NAME,
          columns: [],
          type: row.NON_UNIQUE === 0 ? 'UNIQUE' : 
                row.INDEX_TYPE === 'FULLTEXT' ? 'FULLTEXT' : 'INDEX',
          method: row.INDEX_TYPE === 'BTREE' ? 'BTREE' : 
                  row.INDEX_TYPE === 'HASH' ? 'HASH' : undefined
        });
      }

      indexMap.get(key)!.columns.push(row.COLUMN_NAME);
    }

    return Array.from(indexMap.values());
  }

  private async extractConstraints(): Promise<ConstraintDefinition[]> {
    const constraints: ConstraintDefinition[] = [];

    // Foreign key constraints
    const [fkRows] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME,
        DELETE_RULE,
        UPDATE_RULE
      FROM information_schema.KEY_COLUMN_USAGE kcu
      JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
      ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const row of fkRows as any[]) {
      constraints.push({
        name: row.CONSTRAINT_NAME,
        tableName: row.TABLE_NAME,
        type: 'FOREIGN KEY',
        columns: [row.COLUMN_NAME],
        referencedTable: row.REFERENCED_TABLE_NAME,
        referencedColumns: [row.REFERENCED_COLUMN_NAME],
        onDelete: row.DELETE_RULE,
        onUpdate: row.UPDATE_RULE
      });
    }

    return constraints;
  }

  private async extractTriggers(): Promise<TriggerDefinition[]> {
    const triggers: TriggerDefinition[] = [];

    try {
      const [triggerRows] = await connection.execute(`
        SELECT 
          TRIGGER_NAME,
          EVENT_MANIPULATION,
          ACTION_TIMING,
          EVENT_OBJECT_TABLE,
          ACTION_STATEMENT
        FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE()
      `);

      for (const row of triggerRows as any[]) {
        triggers.push({
          name: row.TRIGGER_NAME,
          tableName: row.EVENT_OBJECT_TABLE,
          timing: row.ACTION_TIMING,
          event: row.EVENT_MANIPULATION,
          body: row.ACTION_STATEMENT
        });
      }
    } catch (error) {
      logger.debug('Could not extract triggers', { error: error.message });
    }

    return triggers;
  }

  private async extractProcedures(): Promise<ProcedureDefinition[]> {
    const procedures: ProcedureDefinition[] = [];

    try {
      const [procRows] = await connection.execute(`
        SELECT 
          ROUTINE_NAME,
          ROUTINE_BODY,
          ROUTINE_DEFINITION,
          DATA_TYPE as RETURN_TYPE,
          ROUTINE_COMMENT
        FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = DATABASE()
        AND ROUTINE_TYPE = 'PROCEDURE'
      `);

      for (const row of procRows as any[]) {
        // Get parameters for this procedure
        const parameters = await this.extractProcedureParameters(row.ROUTINE_NAME);

        procedures.push({
          name: row.ROUTINE_NAME,
          parameters,
          body: row.ROUTINE_DEFINITION,
          returnType: row.RETURN_TYPE,
          comment: row.ROUTINE_COMMENT
        });
      }
    } catch (error) {
      logger.debug('Could not extract procedures', { error: error.message });
    }

    return procedures;
  }

  private async extractProcedureParameters(procedureName: string): Promise<ParameterDefinition[]> {
    try {
      const [paramRows] = await connection.execute(`
        SELECT 
          PARAMETER_NAME,
          DATA_TYPE,
          PARAMETER_MODE
        FROM information_schema.PARAMETERS
        WHERE SPECIFIC_SCHEMA = DATABASE()
        AND SPECIFIC_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [procedureName]);

      return (paramRows as any[]).map(row => ({
        name: row.PARAMETER_NAME,
        type: row.DATA_TYPE,
        direction: row.PARAMETER_MODE || 'IN'
      }));
    } catch (error) {
      return [];
    }
  }

  private async generateCurrentSchema(): Promise<void> {
    this.currentSchema = {
      version: 'current',
      tables: await this.extractTables(),
      indexes: await this.extractIndexes(),
      constraints: await this.extractConstraints(),
      triggers: await this.extractTriggers(),
      procedures: await this.extractProcedures(),
      metadata: {
        createdAt: new Date(),
        description: 'Current database schema snapshot',
        author: 'Schema Validation Service'
      }
    };
  }

  async validateSchema(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      if (!this.expectedSchema) {
        throw new Error('Expected schema not loaded');
      }

      logger.info('Starting schema validation...');

      await this.generateCurrentSchema();

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Validate tables
      await this.validateTables(errors, warnings);

      // Validate indexes
      await this.validateIndexes(errors, warnings);

      // Validate constraints
      await this.validateConstraints(errors, warnings);

      // Validate triggers
      await this.validateTriggers(errors, warnings);

      // Validate procedures
      await this.validateProcedures(errors, warnings);

      const executionTime = Date.now() - startTime;
      const result: ValidationResult = {
        isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
        errors,
        warnings,
        summary: {
          tablesChecked: this.expectedSchema.tables.length,
          indexesChecked: this.expectedSchema.indexes.length,
          constraintsChecked: this.expectedSchema.constraints.length,
          errorsFound: errors.length,
          warningsFound: warnings.length
        },
        executionTime
      };

      this.validationHistory.push(result);
      
      // Keep only last 50 validations
      if (this.validationHistory.length > 50) {
        this.validationHistory = this.validationHistory.slice(-50);
      }

      logger.info('Schema validation completed', {
        isValid: result.isValid,
        errors: result.errors.length,
        warnings: result.warnings.length,
        executionTime
      });

      return result;

    } catch (error) {
      logger.error('Schema validation failed', { error });
      throw error;
    }
  }

  private async validateTables(errors: ValidationError[], warnings: ValidationWarning[]): Promise<void> {
    if (!this.expectedSchema || !this.currentSchema) return;

    for (const expectedTable of this.expectedSchema.tables) {
      const currentTable = this.currentSchema.tables.find(t => t.name === expectedTable.name);

      if (!currentTable) {
        errors.push({
          type: 'MISSING_TABLE',
          severity: 'critical',
          message: `Table '${expectedTable.name}' is missing`,
          table: expectedTable.name,
          suggestedFix: `CREATE TABLE ${expectedTable.name}`
        });
        continue;
      }

      // Validate columns
      await this.validateTableColumns(expectedTable, currentTable, errors, warnings);

      // Validate table properties
      if (expectedTable.engine !== currentTable.engine) {
        warnings.push({
          type: 'PERFORMANCE_CONCERN',
          message: `Table '${expectedTable.name}' has different engine`,
          table: expectedTable.name,
          suggestion: `Expected: ${expectedTable.engine}, Found: ${currentTable.engine}`
        });
      }

      if (expectedTable.charset !== currentTable.charset) {
        warnings.push({
          type: 'PERFORMANCE_CONCERN',
          message: `Table '${expectedTable.name}' has different charset`,
          table: expectedTable.name,
          suggestion: `Expected: ${expectedTable.charset}, Found: ${currentTable.charset}`
        });
      }
    }

    // Check for extra tables
    for (const currentTable of this.currentSchema.tables) {
      const expectedTable = this.expectedSchema.tables.find(t => t.name === currentTable.name);
      if (!expectedTable) {
        warnings.push({
          type: 'PERFORMANCE_CONCERN',
          message: `Unexpected table '${currentTable.name}' found`,
          table: currentTable.name,
          suggestion: 'Verify if this table should be part of the schema'
        });
      }
    }
  }

  private async validateTableColumns(
    expectedTable: TableDefinition,
    currentTable: TableDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    for (const expectedColumn of expectedTable.columns) {
      const currentColumn = currentTable.columns.find(c => c.name === expectedColumn.name);

      if (!currentColumn) {
        errors.push({
          type: 'MISSING_COLUMN',
          severity: 'high',
          message: `Column '${expectedColumn.name}' is missing in table '${expectedTable.name}'`,
          table: expectedTable.name,
          column: expectedColumn.name,
          suggestedFix: `ALTER TABLE ${expectedTable.name} ADD COLUMN ${expectedColumn.name} ${expectedColumn.type}`
        });
        continue;
      }

      // Validate column type
      if (expectedColumn.type !== currentColumn.type) {
        errors.push({
          type: 'TYPE_MISMATCH',
          severity: 'medium',
          message: `Column '${expectedColumn.name}' in table '${expectedTable.name}' has wrong type`,
          table: expectedTable.name,
          column: expectedColumn.name,
          expected: expectedColumn.type,
          actual: currentColumn.type,
          suggestedFix: `ALTER TABLE ${expectedTable.name} MODIFY COLUMN ${expectedColumn.name} ${expectedColumn.type}`
        });
      }

      // Validate nullable
      if (expectedColumn.nullable !== currentColumn.nullable) {
        warnings.push({
          type: 'PERFORMANCE_CONCERN',
          message: `Column '${expectedColumn.name}' in table '${expectedTable.name}' has different nullability`,
          table: expectedTable.name,
          column: expectedColumn.name,
          suggestion: `Expected: ${expectedColumn.nullable ? 'NULL' : 'NOT NULL'}, Found: ${currentColumn.nullable ? 'NULL' : 'NOT NULL'}`
        });
      }
    }
  }

  private async validateIndexes(errors: ValidationError[], warnings: ValidationWarning[]): Promise<void> {
    if (!this.expectedSchema || !this.currentSchema) return;

    for (const expectedIndex of this.expectedSchema.indexes) {
      const currentIndex = this.currentSchema.indexes.find(
        i => i.name === expectedIndex.name && i.tableName === expectedIndex.tableName
      );

      if (!currentIndex) {
        errors.push({
          type: 'MISSING_INDEX',
          severity: 'medium',
          message: `Index '${expectedIndex.name}' is missing on table '${expectedIndex.tableName}'`,
          table: expectedIndex.tableName,
          suggestedFix: `CREATE INDEX ${expectedIndex.name} ON ${expectedIndex.tableName} (${expectedIndex.columns.join(', ')})`
        });
        continue;
      }

      // Validate index columns
      if (JSON.stringify(expectedIndex.columns) !== JSON.stringify(currentIndex.columns)) {
        warnings.push({
          type: 'PERFORMANCE_CONCERN',
          message: `Index '${expectedIndex.name}' has different columns`,
          table: expectedIndex.tableName,
          suggestion: `Expected: [${expectedIndex.columns.join(', ')}], Found: [${currentIndex.columns.join(', ')}]`
        });
      }
    }
  }

  private async validateConstraints(errors: ValidationError[], warnings: ValidationWarning[]): Promise<void> {
    if (!this.expectedSchema || !this.currentSchema) return;

    for (const expectedConstraint of this.expectedSchema.constraints) {
      const currentConstraint = this.currentSchema.constraints.find(
        c => c.name === expectedConstraint.name && c.tableName === expectedConstraint.tableName
      );

      if (!currentConstraint) {
        errors.push({
          type: 'MISSING_CONSTRAINT',
          severity: 'high',
          message: `Constraint '${expectedConstraint.name}' is missing on table '${expectedConstraint.tableName}'`,
          table: expectedConstraint.tableName
        });
      }
    }
  }

  private async validateTriggers(errors: ValidationError[], warnings: ValidationWarning[]): Promise<void> {
    if (!this.expectedSchema || !this.currentSchema) return;

    for (const expectedTrigger of this.expectedSchema.triggers) {
      const currentTrigger = this.currentSchema.triggers.find(
        t => t.name === expectedTrigger.name && t.tableName === expectedTrigger.tableName
      );

      if (!currentTrigger) {
        warnings.push({
          type: 'PERFORMANCE_CONCERN',
          message: `Trigger '${expectedTrigger.name}' is missing on table '${expectedTrigger.tableName}'`,
          table: expectedTrigger.tableName
        });
      }
    }
  }

  private async validateProcedures(errors: ValidationError[], warnings: ValidationWarning[]): Promise<void> {
    if (!this.expectedSchema || !this.currentSchema) return;

    for (const expectedProcedure of this.expectedSchema.procedures) {
      const currentProcedure = this.currentSchema.procedures.find(
        p => p.name === expectedProcedure.name
      );

      if (!currentProcedure) {
        warnings.push({
          type: 'PERFORMANCE_CONCERN',
          message: `Procedure '${expectedProcedure.name}' is missing`,
          suggestion: 'Verify if this procedure is still needed'
        });
      }
    }
  }

  async detectSchemaDrift(): Promise<SchemaDrift[]> {
    const drifts: SchemaDrift[] = [];

    if (!this.expectedSchema || !this.currentSchema) {
      return drifts;
    }

    // Compare table structures
    for (const expectedTable of this.expectedSchema.tables) {
      const currentTable = this.currentSchema.tables.find(t => t.name === expectedTable.name);
      
      if (!currentTable) continue;

      // Check for column changes
      const expectedColumnNames = expectedTable.columns.map(c => c.name);
      const currentColumnNames = currentTable.columns.map(c => c.name);

      // Added columns
      const addedColumns = currentColumnNames.filter(name => !expectedColumnNames.includes(name));
      for (const columnName of addedColumns) {
        drifts.push({
          tableName: expectedTable.name,
          driftType: 'COLUMN_ADDED',
          description: `Column '${columnName}' was added to table '${expectedTable.name}'`,
          detectedAt: new Date(),
          severity: 'info'
        });
      }

      // Removed columns
      const removedColumns = expectedColumnNames.filter(name => !currentColumnNames.includes(name));
      for (const columnName of removedColumns) {
        drifts.push({
          tableName: expectedTable.name,
          driftType: 'COLUMN_REMOVED',
          description: `Column '${columnName}' was removed from table '${expectedTable.name}'`,
          detectedAt: new Date(),
          severity: 'warning'
        });
      }

      // Modified columns
      for (const expectedColumn of expectedTable.columns) {
        const currentColumn = currentTable.columns.find(c => c.name === expectedColumn.name);
        if (currentColumn && expectedColumn.type !== currentColumn.type) {
          drifts.push({
            tableName: expectedTable.name,
            driftType: 'COLUMN_MODIFIED',
            description: `Column '${expectedColumn.name}' type changed from '${expectedColumn.type}' to '${currentColumn.type}'`,
            detectedAt: new Date(),
            severity: 'warning'
          });
        }
      }
    }

    this.driftHistory.push(...drifts);
    return drifts;
  }

  private setupScheduledValidation(): void {
    // Daily validation at 4 AM
    const validationTask = cron.schedule('0 4 * * *', async () => {
      try {
        const result = await this.validateSchema();
        if (!result.isValid) {
          logger.warn('Scheduled schema validation found issues', {
            errors: result.errors.length,
            warnings: result.warnings.length
          });
        }
      } catch (error) {
        logger.error('Scheduled schema validation failed', { error });
      }
    }, { scheduled: true, name: 'schema-validation' });

    this.scheduledTasks.set('validation', validationTask);
    logger.info('Scheduled schema validation configured');
  }

  private setupDriftMonitoring(): void {
    // Weekly drift detection on Sundays at 5 AM
    const driftTask = cron.schedule('0 5 * * 0', async () => {
      try {
        const drifts = await this.detectSchemaDrift();
        if (drifts.length > 0) {
          logger.warn('Schema drift detected', {
            drifts: drifts.length,
            tables: [...new Set(drifts.map(d => d.tableName))]
          });
        }
      } catch (error) {
        logger.error('Schema drift detection failed', { error });
      }
    }, { scheduled: true, name: 'drift-monitoring' });

    this.scheduledTasks.set('drift', driftTask);
    logger.info('Schema drift monitoring configured');
  }

  // Public API methods
  getValidationHistory(): ValidationResult[] {
    return [...this.validationHistory];
  }

  getLatestValidationResult(): ValidationResult | null {
    return this.validationHistory.length > 0 
      ? this.validationHistory[this.validationHistory.length - 1] 
      : null;
  }

  getDriftHistory(): SchemaDrift[] {
    return [...this.driftHistory];
  }

  getCurrentSchema(): SchemaDefinition | null {
    return this.currentSchema;
  }

  getExpectedSchema(): SchemaDefinition | null {
    return this.expectedSchema;
  }

  async updateExpectedSchema(newSchema: SchemaDefinition): Promise<void> {
    await fs.writeFile(this.schemaPath, JSON.stringify(newSchema, null, 2));
    this.expectedSchema = newSchema;
    logger.info('Expected schema updated', { version: newSchema.version });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down schema validation service...');

    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.debug(`Stopped scheduled task: ${name}`);
    });
    this.scheduledTasks.clear();

    logger.info('Schema validation service shutdown completed');
  }
}

// Create and export singleton instance
export const schemaValidationService = new SchemaValidationService();

// Export types
export {
  SchemaDefinition,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  ConstraintDefinition,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SchemaDrift
};

export default schemaValidationService;