const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIRED_FILES = [
  '.env.production',
  'docker-compose.prod.yml',
  'nginx/nginx.conf',
  'scripts/mysql-prod.cnf',
  'scripts/redis.conf',
];

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'DB_PASSWORD',
  'REDIS_PASSWORD',
];

const SECURITY_CHECKS = [
  {
    name: 'Default passwords',
    check: (envContent) => {
      const weakPasswords = ['password', 'admin', 'root', '123456', 'rootpassword'];
      return !weakPasswords.some(weak => envContent.toLowerCase().includes(weak));
    },
  },
  {
    name: 'CORS origin',
    check: (envContent) => {
      return !envContent.includes('localhost') || envContent.includes('NODE_ENV=development');
    },
  },
  {
    name: 'SSL enabled',
    check: (envContent) => {
      return envContent.includes('SSL_ENABLED=true');
    },
  },
];

function checkProductionReadiness() {
  console.log('🔍 Running production readiness checklist...\n');
  
  let errors = 0;
  let warnings = 0;

  // Check required files
  console.log('📁 Checking required files:');
  for (const file of REQUIRED_FILES) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      errors++;
    }
  }

  // Check environment variables
  console.log('\n🔐 Checking environment variables:');
  if (fs.existsSync('.env.production')) {
    const envContent = fs.readFileSync('.env.production', 'utf8');
    
    for (const envVar of REQUIRED_ENV_VARS) {
      if (envContent.includes(`${envVar}=`) && !envContent.includes(`${envVar}=REPLACE`)) {
        console.log(`✅ ${envVar}`);
      } else {
        console.log(`❌ ${envVar} - NOT SET OR PLACEHOLDER`);
        errors++;
      }
    }

    // Security checks
    console.log('\n🛡️ Running security checks:');
    for (const check of SECURITY_CHECKS) {
      if (check.check(envContent)) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`⚠️ ${check.name} - NEEDS ATTENTION`);
        warnings++;
      }
    }
  } else {
    console.log('❌ .env.production file missing');
    errors++;
  }

  // Check Docker
  console.log('\n🐳 Checking Docker:');
  try {
    execSync('docker --version', { stdio: 'ignore' });
    console.log('✅ Docker installed');
  } catch {
    console.log('❌ Docker not installed');
    errors++;
  }

  try {
    execSync('docker-compose --version', { stdio: 'ignore' });
    console.log('✅ Docker Compose installed');
  } catch {
    console.log('❌ Docker Compose not installed');
    errors++;
  }

  // Check SSL certificates
  console.log('\n🔒 Checking SSL certificates:');
  if (fs.existsSync('nginx/ssl/fullchain.pem') && fs.existsSync('nginx/ssl/privkey.pem')) {
    console.log('✅ SSL certificates found');
  } else {
    console.log('⚠️ SSL certificates not found - Remember to add them');
    warnings++;
  }

  // Summary
  console.log('\n📊 Production Readiness Summary:');
  console.log('================================');
  
  if (errors === 0) {
    console.log('🎉 Production readiness: PASSED');
    if (warnings > 0) {
      console.log(`⚠️ ${warnings} warning(s) to address`);
    }
    console.log('\n🚀 Ready to deploy to production!');
    console.log('Next steps:');
    console.log('1. Run: ./deploy-production.sh');
    console.log('2. Monitor: ./monitor-production.sh');
    return true;
  } else {
    console.log(`❌ Production readiness: FAILED (${errors} error(s))`);
    if (warnings > 0) {
      console.log(`⚠️ ${warnings} warning(s) to address`);
    }
    console.log('\n🔧 Fix the errors above before deploying to production');
    return false;
  }
}

module.exports = { checkProductionReadiness };

if (require.main === module) {
  const success = checkProductionReadiness();
  process.exit(success ? 0 : 1);
} 