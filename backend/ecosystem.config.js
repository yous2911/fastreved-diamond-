// ecosystem.config.js - PM2 Configuration for Production
module.exports = {
  apps: [
    {
      // Application configuration
      name: 'reved-kids-api',
      script: 'dist/server.js',
      cwd: '/app',

      // Instance configuration
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Resource limits
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,

      // Logging
      log_file: '/app/logs/combined.log',
      out_file: '/app/logs/out.log',
      error_file: '/app/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Restart policy
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],

      // Advanced options
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 10000,

      // Health monitoring
      health_check_url: 'http://localhost:3001/api/health',
      health_check_grace_period: 3000,

      // Source maps support
      source_map_support: true,

      // Additional environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info',
      },

      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        LOG_LEVEL: 'debug',
      },
    },

    // Background job processor (if needed)
    {
      name: 'reved-kids-worker',
      script: 'dist/worker.js',
      cwd: '/app',
      instances: 2,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background',
      },

      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 5,

      log_file: '/app/logs/worker.log',
      merge_logs: true,

      autorestart: true,
      watch: false,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/reved-kids-fastify.git',
      path: '/var/www/reved-kids',
      'pre-deploy-local': '',
      'post-deploy':
        'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'ForwardAgent=yes',
    },

    staging: {
      user: 'deploy',
      host: ['staging.your-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/reved-kids-fastify.git',
      path: '/var/www/reved-kids-staging',
      'post-deploy':
        'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env staging',
      ssh_options: 'ForwardAgent=yes',
    },
  },
};
