import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { config, dbConfig } from '../config/config';
import { logger } from '../utils/logger';

/**
 * MySQL Database Migration Runner for CP2025 Schema
 * This script sets up the complete database schema for the FastRevEd Kids platform
 */

interface MigrationFile {
  name: string;
  path: string;
  content: string;
}

class MySQLMigrationRunner {
  private connection: mysql.Connection | null = null;

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      // First, connect without specifying database to create it if needed
      this.connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        multipleStatements: true // Allow multiple statements for migrations
      });

      logger.info('Connected to MySQL server', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user
      });

      // Create database if it doesn't exist
      await this.createDatabase();

      // Switch to the target database
      await this.connection.execute(`USE ${dbConfig.database}`);
      
      logger.info('Switched to database', { database: dbConfig.database });

    } catch (error) {
      logger.error('Failed to connect to MySQL:', error);
      throw error;
    }
  }

  /**
   * Create database if it doesn't exist
   */
  private async createDatabase(): Promise<void> {
    try {
      await this.connection!.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
      logger.info('Database created or already exists', { database: dbConfig.database });
    } catch (error) {
      logger.error('Failed to create database:', error);
      throw error;
    }
  }

  /**
   * Get all migration files
   */
  async getMigrationFiles(): Promise<MigrationFile[]> {
    const migrationsDir = path.join(__dirname, 'migrations');
    
    try {
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Execute in alphabetical order

      const migrations: MigrationFile[] = [];
      
      for (const file of sqlFiles) {
        const filePath = path.join(migrationsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        migrations.push({
          name: file,
          path: filePath,
          content
        });
      }

      return migrations;
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration: MigrationFile): Promise<void> {
    try {
      logger.info(`Executing migration: ${migration.name}`);

      // Split the SQL content by semicolon and execute each statement
      const statements = migration.content
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 0) {
          await this.connection!.execute(statement + ';');
        }
      }

      logger.info(`Migration completed: ${migration.name}`);
    } catch (error) {
      logger.error(`Migration failed: ${migration.name}`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      const migrations = await this.getMigrationFiles();
      
      logger.info(`Found ${migrations.length} migration files`);

      for (const migration of migrations) {
        await this.executeMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Insert sample data for testing
   */
  async insertSampleData(): Promise<void> {
    try {
      logger.info('Inserting sample data...');

      // Insert sample students
      await this.connection!.execute(`
        INSERT IGNORE INTO students (prenom, nom, identifiant, mot_de_passe, classe, age_group) VALUES
        ('Emma', 'Martin', 'emma.cp1', '$2b$10$rQZ2ZKKVGKKVhBBvYYF8huYmZvYmRLyZ8KKVhBBvYYF8huYmZvYmRL', 'CP', '6-8'),
        ('Lucas', 'Dubois', 'lucas.cp1', '$2b$10$rQZ2ZKKVGKKVhBBvYYF8huYmZvYmRLyZ8KKVhBBvYYF8huYmZvYmRL', 'CP', '6-8'),
        ('Léa', 'Bernard', 'lea.cp1', '$2b$10$rQZ2ZKKVGKKVhBBvYYF8huYmZvYmRLyZ8KKVhBBvYYF8huYmZvYmRL', 'CP', '6-8'),
        ('Noah', 'Garcia', 'noah.ce1', '$2b$10$rQZ2ZKKVGKKVhBBvYYF8huYmZvYmRLyZ8KKVhBBvYYF8huYmZvYmRL', 'CE1', '9-11'),
        ('Alice', 'Rodriguez', 'alice.ce1', '$2b$10$rQZ2ZKKVGKKVhBBvYYF8huYmZvYmRLyZ8KKVhBBvYYF8huYmZvYmRL', 'CE1', '9-11')
      `);

      // Insert sample competences
      await this.connection!.execute(`
        INSERT IGNORE INTO competences_cp (code, nom, matiere, domaine, niveau_comp, sous_competence, description) VALUES
        -- Français - Lecture
        ('CP.FR.L1.1', 'Maîtriser les 15 CGP de la Période 1', 'FR', 'L', 1, 1, 'Voyelles + consonnes de base'),
        ('CP.FR.L1.2', 'Maîtriser les 25-30 CGP supplémentaires de la Période 2', 'FR', 'L', 1, 2, 'Consonnes et voyelles étendues'),
        ('CP.FR.L2.1', 'Assembler phonèmes en syllabes CV', 'FR', 'L', 2, 1, 'Combinatoire de base'),
        ('CP.FR.C1.1', 'Comprendre phrases simples déchiffrables', 'FR', 'C', 1, 1, 'Compréhension de base'),
        ('CP.FR.E1.1', 'Maîtriser l\\'écriture cursive sur réglure 3mm', 'FR', 'E', 1, 1, 'Geste graphique'),
        
        -- Mathématiques - Nombres
        ('CP.MA.N1.1', 'Maîtriser nombres 0-10', 'MA', 'N', 1, 1, 'Construction du nombre'),
        ('CP.MA.N1.2', 'Maîtriser nombres 11-20', 'MA', 'N', 1, 2, 'Nombres jusqu\\'à 20'),
        ('CP.MA.N3.1', 'Automatiser additions dans les 10', 'MA', 'N', 3, 1, 'Calcul mental addition'),
        ('CP.MA.N3.2', 'Automatiser soustractions dans les 10', 'MA', 'N', 3, 2, 'Calcul mental soustraction'),
        ('CP.MA.P1.1', 'Résoudre problèmes d\\'addition simple', 'MA', 'P', 1, 1, 'Problèmes additifs')
      `);

      // Insert sample exercises
      await this.connection!.execute(`
        INSERT IGNORE INTO exercises (competence_id, type, question, correct_answer, options, difficulty_level) VALUES
        -- Exercises for CP.FR.L1.1 (CGP Période 1)
        (1, 'QCM', 'Quel son fait la lettre "a" ?', 'a', '["a", "e", "i", "o"]', 0),
        (1, 'QCM', 'Dans le mot "papa", quel son fait "a" ?', 'a', '["a", "e", "i", "o"]', 1),
        (1, 'LECTURE', 'Lis la syllabe "pa"', 'pa', NULL, 2),
        
        -- Exercises for CP.MA.N3.1 (Addition dans les 10)
        (8, 'CALCUL', 'Calcule: 3 + 2 = ?', '5', '["3", "4", "5", "6"]', 0),
        (8, 'CALCUL', 'Calcule: 5 + 3 = ?', '8', '["6", "7", "8", "9"]', 1),
        (8, 'MENTAL_MATH', 'Calcule rapidement: 4 + 3', '7', '["6", "7", "8", "9"]', 3)
      `);

      // Insert mascots for students
      await this.connection!.execute(`
        INSERT IGNORE INTO mascots (student_id, type, current_emotion) VALUES
        (1, 'dragon', 'happy'),
        (2, 'fairy', 'idle'),
        (3, 'robot', 'thinking'),
        (4, 'cat', 'happy'),
        (5, 'owl', 'thinking')
      `);

      // Insert wardrobe items
      await this.connection!.execute(`
        INSERT IGNORE INTO wardrobe_items (name, type, rarity, unlock_requirement_type, unlock_requirement_value, description, icon) VALUES
        ('Chapeau de Magicien', 'hat', 'epic', 'xp', 1000, 'Un chapeau magique qui scintille d\\'étoiles !', '🧙‍♂️'),
        ('Couronne Royale', 'hat', 'legendary', 'streak', 30, 'Pour les vrais champions de l\\'apprentissage !', '👑'),
        ('Casquette Cool', 'hat', 'common', 'exercises', 10, 'Style décontracté pour apprendre !', '🧢'),
        ('Baguette Magique', 'accessory', 'epic', 'achievement', 10, 'Transforme chaque erreur en apprentissage !', '🪄'),
        ('Médaille d\\'Or', 'accessory', 'epic', 'streak', 21, 'Champion de l\\'apprentissage !', '🥇')
      `);

      // Insert achievements
      await this.connection!.execute(`
        INSERT IGNORE INTO achievements (name, description, icon, requirement_type, requirement_value, xp_reward) VALUES
        ('Premier Pas', 'Compléter ton premier exercice', '👣', 'exercises', 1, 10),
        ('Lecteur Débutant', 'Maîtriser 5 compétences de lecture', '📚', 'competences', 5, 50),
        ('Calculateur', 'Maîtriser 5 compétences de mathématiques', '🔢', 'competences', 5, 50),
        ('Persévérant', 'Maintenir une série de 7 jours', '🔥', 'streak', 7, 100),
        ('Expert CP', 'Maîtriser toutes les compétences CP', '🏆', 'competences', 20, 500)
      `);

      // Insert student stats
      await this.connection!.execute(`
        INSERT IGNORE INTO student_stats (student_id, total_exercises_completed, total_correct_answers, competences_mastered) VALUES
        (1, 0, 0, 0),
        (2, 0, 0, 0),
        (3, 0, 0, 0),
        (4, 0, 0, 0),
        (5, 0, 0, 0)
      `);

      logger.info('Sample data inserted successfully');
    } catch (error) {
      logger.error('Failed to insert sample data:', error);
      throw error;
    }
  }

  /**
   * Verify database setup
   */
  async verifySetup(): Promise<void> {
    try {
      logger.info('Verifying database setup...');

      // Check if all tables exist
      const [tables] = await this.connection!.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [dbConfig.database]);

      const tableNames = (tables as any[]).map(row => row.TABLE_NAME);
      
      const expectedTables = [
        'students', 'competences_cp', 'exercises', 'student_progress',
        'learning_sessions', 'exercise_results', 'mascots', 'wardrobe_items',
        'student_wardrobe', 'achievements', 'student_achievements', 'student_stats'
      ];

      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        logger.error('Missing tables:', missingTables);
        throw new Error(`Missing tables: ${missingTables.join(', ')}`);
      }

      // Check sample data
      const [studentCount] = await this.connection!.execute(`
        SELECT COUNT(*) as count FROM students
      `);
      
      const [competenceCount] = await this.connection!.execute(`
        SELECT COUNT(*) as count FROM competences_cp
      `);

      logger.info('Database verification completed', {
        tables: tableNames.length,
        students: (studentCount as any[])[0].count,
        competences: (competenceCount as any[])[0].count
      });

    } catch (error) {
      logger.error('Database verification failed:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      logger.info('Database connection closed');
    }
  }
}

/**
 * Main migration function
 */
export async function runMigrations(includeSampleData: boolean = true): Promise<void> {
  const migrationRunner = new MySQLMigrationRunner();
  
  try {
    logger.info('Starting MySQL database migration...');
    
    await migrationRunner.connect();
    await migrationRunner.runMigrations();
    
    if (includeSampleData) {
      await migrationRunner.insertSampleData();
    }
    
    await migrationRunner.verifySetup();
    
    logger.info('MySQL database migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await migrationRunner.disconnect();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  const includeSampleData = process.argv.includes('--sample-data') || process.argv.includes('-s');
  
  runMigrations(includeSampleData)
    .then(() => {
      console.log('✅ Database migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}