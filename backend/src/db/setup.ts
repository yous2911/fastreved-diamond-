import { db } from './connection';
import { 
  students, 
  exercises, 
  studentProgress,
  parentalConsent,
  gdprRequests,
  auditLogs,
  encryptionKeys,
  retentionPolicies,
  consentPreferences
} from './schema';
import { sql } from 'drizzle-orm';
import { config } from '../config/config';

export async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');
    
    // Create tables using Drizzle migrations
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prenom TEXT NOT NULL,
        nom TEXT NOT NULL,
        date_naissance TEXT NOT NULL,
        niveau_actuel TEXT NOT NULL,
        total_points INTEGER DEFAULT 0,
        serie_jours INTEGER DEFAULT 0,
        mascotte_type TEXT DEFAULT 'dragon',
        dernier_acces TEXT,
        est_connecte INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titre TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        difficulte TEXT NOT NULL,
        xp INTEGER DEFAULT 10,
        configuration TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS student_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (exercise_id) REFERENCES exercises (id)
      )
    `);

    // Create GDPR tables if GDPR is enabled
    if (config.GDPR_ENABLED) {
      console.log('🔄 Creating GDPR compliance tables...');
      
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS parental_consent (
          id TEXT PRIMARY KEY,
          parent_email TEXT NOT NULL,
          parent_name TEXT NOT NULL,
          child_name TEXT NOT NULL,
          child_age INTEGER NOT NULL,
          consent_types TEXT NOT NULL,
          status TEXT NOT NULL,
          first_consent_token TEXT NOT NULL,
          second_consent_token TEXT,
          first_consent_date TEXT,
          second_consent_date TEXT,
          verification_date TEXT,
          expiry_date TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          user_agent TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS gdpr_requests (
          id TEXT PRIMARY KEY,
          request_type TEXT NOT NULL,
          requester_type TEXT NOT NULL,
          requester_email TEXT NOT NULL,
          requester_name TEXT NOT NULL,
          student_id INTEGER,
          student_name TEXT,
          parent_email TEXT,
          request_details TEXT NOT NULL,
          urgent_request INTEGER DEFAULT 0,
          status TEXT NOT NULL,
          priority TEXT NOT NULL,
          submitted_at TEXT NOT NULL,
          due_date TEXT NOT NULL,
          verification_token TEXT,
          verified_at TEXT,
          assigned_to TEXT,
          processed_at TEXT,
          completed_at TEXT,
          ip_address TEXT NOT NULL,
          user_agent TEXT NOT NULL,
          verification_method TEXT NOT NULL,
          legal_basis TEXT,
          response_details TEXT,
          actions_taken TEXT,
          exported_data TEXT,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          user_id TEXT,
          parent_id TEXT,
          student_id INTEGER,
          details TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          timestamp TEXT NOT NULL,
          severity TEXT NOT NULL,
          category TEXT,
          session_id TEXT,
          correlation_id TEXT,
          checksum TEXT NOT NULL,
          encrypted INTEGER DEFAULT 0,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS encryption_keys (
          id TEXT PRIMARY KEY,
          key_data TEXT NOT NULL,
          algorithm TEXT NOT NULL,
          version INTEGER NOT NULL,
          usage TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS retention_policies (
          id TEXT PRIMARY KEY,
          policy_name TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          retention_period_days INTEGER NOT NULL,
          trigger_condition TEXT NOT NULL,
          action TEXT NOT NULL,
          priority TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          legal_basis TEXT,
          exceptions TEXT,
          notification_days INTEGER DEFAULT 30,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_executed TEXT,
          records_processed INTEGER DEFAULT 0
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS consent_preferences (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          student_id INTEGER,
          essential INTEGER DEFAULT 1,
          functional INTEGER DEFAULT 0,
          analytics INTEGER DEFAULT 0,
          marketing INTEGER DEFAULT 0,
          personalization INTEGER DEFAULT 0,
          version TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `);

      // Create files table for file upload functionality
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          original_name TEXT NOT NULL,
          filename TEXT NOT NULL,
          mimetype TEXT NOT NULL,
          size INTEGER NOT NULL,
          path TEXT NOT NULL,
          url TEXT NOT NULL,
          thumbnail_url TEXT,
          metadata TEXT,
          uploaded_by TEXT NOT NULL,
          uploaded_at TEXT NOT NULL,
          category TEXT NOT NULL,
          is_public INTEGER DEFAULT 0,
          status TEXT NOT NULL,
          checksum TEXT NOT NULL,
          deleted_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS file_variants (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL,
          type TEXT NOT NULL,
          filename TEXT NOT NULL,
          path TEXT NOT NULL,
          url TEXT NOT NULL,
          size INTEGER NOT NULL,
          mimetype TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL,
          deleted_at TEXT,
          FOREIGN KEY (file_id) REFERENCES files (id)
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS file_access_logs (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL,
          user_id TEXT,
          student_id INTEGER,
          action TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          timestamp TEXT NOT NULL,
          details TEXT,
          FOREIGN KEY (file_id) REFERENCES files (id),
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS security_scans (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL,
          scan_engine TEXT NOT NULL,
          scan_date TEXT NOT NULL,
          is_clean INTEGER NOT NULL,
          threats TEXT,
          quarantined INTEGER DEFAULT 0,
          details TEXT,
          FOREIGN KEY (file_id) REFERENCES files (id)
        )
      `);

      // Create additional GDPR tables
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS gdpr_consent_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          request_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          request_token TEXT NOT NULL UNIQUE,
          parent_email TEXT NOT NULL,
          request_details TEXT NOT NULL DEFAULT '{}',
          processed_at TEXT,
          processed_by TEXT,
          expires_at TEXT NOT NULL,
          metadata TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id)
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS gdpr_data_processing_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          action TEXT NOT NULL,
          data_type TEXT NOT NULL,
          description TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          request_id TEXT,
          metadata TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id)
        )
      `);

      // Create session and other required tables for compatibility
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          student_id INTEGER,
          data TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id)
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS revisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          exercise_id INTEGER,
          revision_date TEXT NOT NULL,
          score INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id),
          FOREIGN KEY (exercise_id) REFERENCES exercises(id)
        )
      `);

      await db.run(sql`
        CREATE TABLE IF NOT EXISTS modules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titre TEXT NOT NULL,
          description TEXT,
          matiere TEXT NOT NULL,
          niveau TEXT NOT NULL,
          ordre INTEGER DEFAULT 0,
          est_actif INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      console.log('✅ GDPR compliance tables created');
    }

    console.log('✅ Database tables created');

    // Check if we already have data
    const existingStudents = await db.select().from(students);
    
    if (existingStudents.length === 0) {
      console.log('🌱 Seeding database with test data...');
      
      // Insert test students
      await db.insert(students).values([
        {
          prenom: 'Alice',
          nom: 'Dupont',
          dateNaissance: '2015-03-15',
          niveauActuel: 'CP',
          totalPoints: 150,
          serieJours: 5,
          mascotteType: 'dragon',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          prenom: 'Lucas',
          nom: 'Martin',
          dateNaissance: '2014-08-22',
          niveauActuel: 'CE1',
          totalPoints: 320,
          serieJours: 12,
          mascotteType: 'robot',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          prenom: 'Emma',
          nom: 'Bernard',
          dateNaissance: '2015-11-08',
          niveauActuel: 'CP',
          totalPoints: 85,
          serieJours: 3,
          mascotteType: 'fairy',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]);

      // Insert test exercises
      await db.insert(exercises).values([
        {
          titre: 'Addition simple',
          description: 'Apprendre à additionner des nombres simples',
          type: 'CALCUL',
          difficulte: 'FACILE',
          xp: 10,
          configuration: JSON.stringify({
            question: 'Combien font 2 + 3 ?',
            bonneReponse: '5',
            type: 'addition'
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          titre: 'Lecture de mots',
          description: 'Lire des mots simples',
          type: 'LECTURE',
          difficulte: 'FACILE',
          xp: 15,
          configuration: JSON.stringify({
            question: 'Lis le mot : "chat"',
            bonneReponse: 'chat',
            type: 'lecture'
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          titre: 'Géométrie - Formes',
          description: 'Reconnaître les formes géométriques',
          type: 'GEOMETRIE',
          difficulte: 'MOYEN',
          xp: 20,
          configuration: JSON.stringify({
            question: 'Quelle forme a 4 côtés égaux ?',
            bonneReponse: 'carré',
            type: 'geometrie'
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]);

      console.log('✅ Test data seeded successfully');
    } else {
      console.log('✅ Database already has data, skipping seed');
    }

    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
} 