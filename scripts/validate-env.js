#!/usr/bin/env node

/**
 * Validates environment variables are properly set
 * Run: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

// Required environment variables by environment
const requiredVars = {
  common: [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'REDIS_URL',
    'SESSION_SECRET',
    'JWT_SECRET',
  ],
  development: [
    'LOG_LEVEL',
  ],
  staging: [
    'AZURE_WEBAPP_NAME',
    'FRONTEND_URL',
  ],
  production: [
    'FRONTEND_URL',
    'LOG_LEVEL',
  ],
  test: [
    'TEST_TIMEOUT',
    'HEADLESS_BROWSER',
  ],
};

// Validate current environment
function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');

  const env = process.env.NODE_ENV || 'development';
  const missing = [];
  const warnings = [];

  // Check common variables
  requiredVars.common.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check environment-specific variables
  if (requiredVars[env]) {
    requiredVars[env].forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });
  }

  // Validate values
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    warnings.push('SESSION_SECRET should be at least 32 characters long');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long');
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    warnings.push('DATABASE_URL should start with postgresql://');
  }

  // Report results
  console.log(`Environment: ${env}`);
  console.log(`Total variables checked: ${requiredVars.common.length + (requiredVars[env]?.length || 0)}`);

  if (missing.length === 0) {
    console.log('✅ All required environment variables are set!\n');
  } else {
    console.log(`❌ Missing ${missing.length} required variables:\n`);
    missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:\n');
    warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
    console.log('');
  }

  // Check for .env file
  const envFile = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envFile)) {
    console.log('💡 Tip: No .env file found. Create one by copying .env.example\n');
  }

  // Test database connection
  if (process.env.DATABASE_URL) {
    console.log('🔗 Testing database connection...');
    testDatabaseConnection();
  }

  // Test Redis connection
  if (process.env.REDIS_URL) {
    console.log('🔗 Testing Redis connection...');
    testRedisConnection();
  }

  process.exit(missing.length > 0 ? 1 : 0);
}

async function testDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    await pool.query('SELECT 1');
    console.log('✅ Database connection successful!\n');
    await pool.end();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message, '\n');
  }
}

async function testRedisConnection() {
  try {
    const redis = require('redis');
    const client = redis.createClient({
      url: process.env.REDIS_URL,
    });

    await client.connect();
    await client.ping();
    console.log('✅ Redis connection successful!\n');
    await client.quit();
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message, '\n');
  }
}

// Load .env file if it exists
require('dotenv').config();

// Run validation
validateEnvironment();