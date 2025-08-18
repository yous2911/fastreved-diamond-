// debug-server.js - Diagnostic script to identify server startup issues
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 Starting server diagnostics...\n');

// Test 1: Basic Node.js functionality
console.log('✅ Test 1: Node.js basic functionality - PASSED');

// Test 2: Environment variables
console.log('\n🔍 Test 2: Environment variables');
try {
  require('dotenv').config({ path: 'env.backend' });
  console.log('✅ dotenv loaded successfully');
  
  const requiredVars = ['JWT_SECRET', 'ENCRYPTION_KEY'];
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: ${process.env[varName].substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: MISSING`);
    }
  }
} catch (error) {
  console.log('❌ dotenv error:', error.message);
}

// Test 3: Database connection
console.log('\n🔍 Test 3: Database connection');
try {
  const Database = require('better-sqlite3');
  const sqlite = new Database('reved_kids.db');
  console.log('✅ SQLite database opened successfully');
  
  const result = sqlite.prepare('SELECT 1 as test').get();
  console.log('✅ SQLite query executed:', result);
  
  sqlite.close();
  console.log('✅ SQLite database closed');
} catch (error) {
  console.log('❌ Database error:', error.message);
}

// Test 4: Drizzle ORM
console.log('\n🔍 Test 4: Drizzle ORM');
try {
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const Database = require('better-sqlite3');
  
  const sqlite = new Database('reved_kids.db');
  const db = drizzle(sqlite);
  console.log('✅ Drizzle ORM initialized');
  
  sqlite.close();
} catch (error) {
  console.log('❌ Drizzle error:', error.message);
}

// Test 5: Fastify
console.log('\n🔍 Test 5: Fastify');
try {
  const Fastify = require('fastify');
  const fastify = Fastify({ logger: false });
  console.log('✅ Fastify instance created');
  
  fastify.close();
  console.log('✅ Fastify instance closed');
} catch (error) {
  console.log('❌ Fastify error:', error.message);
}

// Test 6: TypeScript compilation
console.log('\n🔍 Test 6: TypeScript compilation');
try {
  const { execSync } = require('child_process');
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation check passed');
} catch (error) {
  console.log('❌ TypeScript compilation errors:', error.message);
}

// Test 7: Server startup with tsx
console.log('\n🔍 Test 7: Server startup test');
console.log('Starting server with tsx...');

const serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' }
});

let serverOutput = '';
let serverError = '';

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log('Server output:', output.trim());
});

serverProcess.stderr.on('data', (data) => {
  const error = data.toString();
  serverError += error;
  console.log('Server error:', error.trim());
});

serverProcess.on('close', (code) => {
  console.log(`\n🔍 Server process exited with code ${code}`);
  
  if (code === 0) {
    console.log('✅ Server started successfully');
  } else {
    console.log('❌ Server failed to start');
    console.log('Full error output:', serverError);
  }
});

// Wait 10 seconds then kill the server
setTimeout(() => {
  serverProcess.kill();
  console.log('\n🎯 Diagnostics complete!');
}, 10000); 