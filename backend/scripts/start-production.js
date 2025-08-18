const { execSync } = require('child_process');
const { checkProductionReadiness } = require('./production-checklist');

async function startProduction() {
  console.log('🚀 Starting RevEd Kids in production mode...\n');

  // Run production checklist
  const isReady = checkProductionReadiness();
  
  if (!isReady) {
    console.log('\n❌ Production readiness check failed');
    console.log('Fix the issues above and try again');
    process.exit(1);
  }

  console.log('\n📦 Building and starting services...');
  
  try {
    // Stop any existing containers
    console.log('🛑 Stopping existing containers...');
    execSync('docker-compose -f docker-compose.prod.yml down', { stdio: 'inherit' });

    // Build images
    console.log('🔨 Building Docker images...');
    execSync('docker-compose -f docker-compose.prod.yml build --no-cache', { stdio: 'inherit' });

    // Start services
    console.log('🚀 Starting services...');
    execSync('docker-compose -f docker-compose.prod.yml up -d', { stdio: 'inherit' });

    // Wait for services to be ready
    console.log('⏳ Waiting for services to start...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Health check
    console.log('🔍 Running health checks...');
    try {
      execSync('curl -f http://localhost:3001/api/health', { stdio: 'ignore' });
      console.log('✅ Application health check passed');
    } catch {
      console.log('⚠️ Application health check failed - check logs');
    }

    console.log('\n🎉 Production deployment completed!');
    console.log('📊 Service URLs:');
    console.log('   - API: http://localhost:3001/api');
    console.log('   - Health: http://localhost:3001/api/health');
    console.log('   - Docs: http://localhost:3001/docs');
    console.log('   - Monitoring: http://localhost:3001/api/monitoring/health');
    
    console.log('\n📝 Useful commands:');
    console.log('   - View logs: docker-compose -f docker-compose.prod.yml logs -f');
    console.log('   - Monitor: ./monitor-production.sh');
    console.log('   - Backup: ./backup-database.sh');
    console.log('   - Stop: docker-compose -f docker-compose.prod.yml down');

  } catch (error) {
    console.error('\n❌ Production deployment failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check Docker is running: docker ps');
    console.log('2. Check logs: docker-compose -f docker-compose.prod.yml logs');
    console.log('3. Check environment: cat .env.production');
    process.exit(1);
  }
}

if (require.main === module) {
  startProduction();
} 