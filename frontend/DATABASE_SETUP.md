# 🗄️ Database Setup Guide

## Step 1: Create PlanetScale Account
1. Go to: https://planetscale.com
2. Sign up (free account)
3. Click "Create database"
4. Name: `reved-kids-db`
5. Region: Choose closest to you

## Step 2: Get Connection String
1. In PlanetScale dashboard
2. Go to "Connect" tab
3. Select "Node.js"
4. Copy the connection string

## Step 3: Update Backend Environment
Create/update `backend/.env`:

```env
NODE_ENV=production
PORT=3003

# PlanetScale Database
DB_HOST=your-host.psdb.cloud
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=reved-kids-db

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
```

## Step 4: Run Database Migrations
```bash
cd backend
npm run migrate
```

## Step 5: Test Connection
```bash
cd backend
npm start
```

## Alternative: Railway Database
If PlanetScale doesn't work:
1. Go to: https://railway.app
2. Create MySQL database
3. Use connection details in .env


