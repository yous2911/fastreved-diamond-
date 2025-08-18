#!/usr/bin/env node
/**
 * FastRevEd Kids Development Server Startup Script
 * 
 * This script:
 * 1. Checks environment configuration
 * 2. Runs database migrations (if needed)
 * 3. Starts the development server
 * 4. Provides helpful development information
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const PROJECT_ROOT = __dirname;
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

/**
 * Display startup banner
 */
function showBanner() {
  console.log(chalk.bold.blue('🚀 FastRevEd Kids - Backend Development Server'));
  console.log(chalk.gray('Educational Platform for CP/CE1/CE2 Students'));
  console.log(chalk.gray('='.repeat(60)));
}

/**
 * Check if .env file exists and is configured
 */
function checkEnvironment() {
  console.log(chalk.yellow('🔧 Checking environment configuration...'));
  
  if (!fs.existsSync(ENV_FILE)) {
    console.log(chalk.red('❌ .env file not found!'));
    console.log(chalk.yellow('Please copy .env.example to .env and configure it.'));
    console.log(chalk.gray('cp env.example .env'));
    return false;
  }
  
  // Read and validate key environment variables
  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  const requiredVars = [
    'DB_HOST', 'DB_USER', 'DB_NAME', 
    'JWT_SECRET', 'ENCRYPTION_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    return !regex.test(envContent);
  });
  
  if (missingVars.length > 0) {
    console.log(chalk.red('❌ Missing required environment variables:'));
    missingVars.forEach(varName => {
      console.log(chalk.red(`   - ${varName}`));
    });
    return false;
  }
  
  console.log(chalk.green('✅ Environment configuration looks good'));
  return true;
}

/**
 * Run database migration
 */
async function runMigration() {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow('🗄️  Running database migration...'));
    
    const migration = spawn('tsx', ['src/db/migrate-mysql.ts', '--sample-data'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    migration.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      // Show important migration messages
      if (text.includes('Migration completed') || text.includes('Sample data')) {
        console.log(chalk.gray(`   ${text.trim()}`));
      }
    });
    
    migration.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    migration.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('✅ Database migration completed successfully'));
        resolve();
      } else {
        console.log(chalk.red('❌ Database migration failed'));
        if (errorOutput) {
          console.log(chalk.red(errorOutput));
        }
        reject(new Error('Migration failed'));
      }
    });
    
    migration.on('error', (error) => {
      console.log(chalk.red('❌ Failed to run migration:'), error.message);
      reject(error);
    });
  });
}

/**
 * Start the development server
 */
function startServer() {
  console.log(chalk.yellow('🌐 Starting development server...'));
  
  const server = spawn('npm', ['run', 'dev'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
  
  server.on('error', (error) => {
    console.log(chalk.red('❌ Failed to start server:'), error.message);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Shutting down development server...'));
    server.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Shutting down development server...'));
    server.kill('SIGTERM');
    process.exit(0);
  });
}

/**
 * Display helpful development information
 */
function showDevInfo() {
  console.log(chalk.green('\n🎉 Development server is starting up!'));
  console.log(chalk.gray('Development Information:'));
  console.log(chalk.gray('- Server: http://localhost:5000'));
  console.log(chalk.gray('- API: http://localhost:5000/api'));
  console.log(chalk.gray('- Health Check: http://localhost:5000/api/health'));
  console.log(chalk.gray('- API Documentation: http://localhost:5000/docs'));
  console.log(chalk.gray(''));
  console.log(chalk.blue('Available API Endpoints:'));
  console.log(chalk.gray('- POST /api/auth/login - Student authentication'));
  console.log(chalk.gray('- GET  /api/students/:id - Get student profile'));
  console.log(chalk.gray('- GET  /api/competences - Get CP 2025 competences'));
  console.log(chalk.gray('- GET  /api/exercises/:competenceId - Get exercises'));
  console.log(chalk.gray('- POST /api/exercises/:id/submit - Submit answer'));
  console.log(chalk.gray('- GET  /api/mascots/:studentId - Get student mascot'));
  console.log(chalk.gray('- PUT  /api/mascots/:studentId - Update mascot'));
  console.log(chalk.gray('- GET  /api/wardrobe/:studentId - Get wardrobe'));
  console.log(chalk.gray('- POST /api/sessions/start - Start learning session'));
  console.log(chalk.gray('- POST /api/sessions/:id/end - End session'));
  console.log(chalk.gray(''));
  console.log(chalk.blue('Test Accounts (password: password123):'));
  console.log(chalk.gray('- emma.cp1 (Emma Martin - CP)'));
  console.log(chalk.gray('- lucas.cp1 (Lucas Dubois - CP)'));
  console.log(chalk.gray('- lea.cp1 (Léa Bernard - CP)'));
  console.log(chalk.gray(''));
  console.log(chalk.yellow('💡 Tip: Run "node test-setup.js" to test all endpoints'));
  console.log(chalk.gray('='.repeat(60)));
}

/**
 * Main startup sequence
 */
async function main() {
  try {
    showBanner();
    
    // Check environment
    if (!checkEnvironment()) {
      process.exit(1);
    }
    
    // Run migration (with basic error handling)
    try {
      await runMigration();
    } catch (error) {
      console.log(chalk.yellow('⚠️  Migration failed, but continuing...'));
      console.log(chalk.gray('This might be normal if the database is already set up.'));
    }
    
    // Show development information
    showDevInfo();
    
    // Start the server
    startServer();
    
  } catch (error) {
    console.log(chalk.red('❌ Startup failed:'), error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(chalk.bold.blue('FastRevEd Kids Development Server'));
  console.log('\nUsage: node start-dev.js [options]');
  console.log('\nOptions:');
  console.log('  --help, -h     Show this help message');
  console.log('  --no-migrate   Skip database migration');
  console.log('\nThis script will:');
  console.log('1. Check environment configuration');
  console.log('2. Run database migrations (if needed)');
  console.log('3. Start the development server');
  process.exit(0);
}

// Run the startup sequence
main();