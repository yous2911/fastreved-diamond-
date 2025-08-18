# RevEd Kids Backend - Environment Setup Script (PowerShell)
Write-Host "🔐 RevEd Kids Backend - Environment Setup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit 1
    }
}

# Generate secure secrets
Write-Host "🔑 Generating secure secrets..." -ForegroundColor Cyan
$JWT_SECRET = -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$ENCRYPTION_KEY = -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Create .env file
Write-Host "📝 Creating .env file..." -ForegroundColor Cyan
$envContent = @"
# Environment Variables for RevEd Kids Backend
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=reved_user
DB_PASSWORD=your_secure_password_here
DB_NAME=reved_kids
DB_CONNECTION_LIMIT=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true

# Security (Generated automatically - KEEP THESE SECRET!)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Monitoring
ENABLE_METRICS=true
METRICS_INTERVAL=60000

# Cache
CACHE_TTL=900
CACHE_MAX_SIZE=1000

# Performance
REQUEST_TIMEOUT=30000
BODY_LIMIT=10485760

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=1000
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔒 IMPORTANT SECURITY NOTES:" -ForegroundColor Yellow
Write-Host "   - Your JWT_SECRET and ENCRYPTION_KEY have been generated automatically" -ForegroundColor White
Write-Host "   - These are unique to your installation - DO NOT SHARE THEM" -ForegroundColor White
Write-Host "   - The .env file is already in .gitignore and will not be committed" -ForegroundColor White
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   1. Update DB_PASSWORD with your actual database password" -ForegroundColor White
Write-Host "   2. Update DB_USER if different from 'reved_user'" -ForegroundColor White
Write-Host "   3. Run: npm install" -ForegroundColor White
Write-Host "   4. Run: npm run db:migrate" -ForegroundColor White
Write-Host "   5. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Happy coding!" -ForegroundColor Green 