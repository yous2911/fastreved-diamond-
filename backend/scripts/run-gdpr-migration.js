const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Path to the database file
const dbPath = path.join(__dirname, '..', 'reved_kids.db');

// Path to the migration SQL file
const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', 'add-gdpr-tables.sql');

console.log('🔄 Running GDPR migration...');
console.log('📁 Database:', dbPath);
console.log('📄 Migration:', migrationPath);

// Check if database file exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found:', dbPath);
  process.exit(1);
}

// Check if migration file exists
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file not found:', migrationPath);
  process.exit(1);
}

// Read the migration SQL
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Run the migration
db.exec(migrationSQL, (err) => {
  if (err) {
    console.error('❌ Error running migration:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('✅ GDPR migration completed successfully!');
  
  // Verify tables were created
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('files', 'gdpr_consent_requests', 'gdpr_data_processing_log')", (err, rows) => {
    if (err) {
      console.error('❌ Error verifying tables:', err.message);
    } else {
      console.log('📋 Created tables:', rows.map(row => row.name));
    }
    
    db.close();
    console.log('✅ Migration process completed');
  });
}); 