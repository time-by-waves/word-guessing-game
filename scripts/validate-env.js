#!/usr/bin/env node

/**
 * Validates environment variables are properly set
 * Run: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  DATABASE_URL: 'DATABASE_URL',
  REDIS_URL: 'REDIS_URL',
  SESSION_SECRET: 'SESSION_SECRET',
  JWT_SECRET: 'JWT_SECRET',
  LOG_LEVEL: 'LOG_LEVEL',
  AZURE_WEBAPP_NAME: 'AZURE_WEBAPP_NAME',
  FRONTEND_URL: 'FRONTEND_URL',
  TEST_TIMEOUT: 'TEST_TIMEOUT',
  HEADLESS_BROWSER: 'HEADLESS_BROWSER',
};

// Required environment variables by environment
const requiredVars = {
  common: [
    ENV_VARS.NODE_ENV,
    ENV_VARS.PORT,
    ENV_VARS.DATABASE_URL,
    ENV_VARS.REDIS_URL,
    ENV_VARS.SESSION_SECRET,
    ENV_VARS.JWT_SECRET,
  ],
  development: [ENV_VARS.LOG_LEVEL],
  staging: [ENV_VARS.AZURE_WEBAPP_NAME, ENV_VARS.FRONTEND_URL],
  production: [ENV_VARS.FRONTEND_URL, ENV_VARS.LOG_LEVEL],
  test: [ENV_VARS.TEST_TIMEOUT, ENV_VARS.HEADLESS_BROWSER],
};

// Validate current environment
function validateEnvironment() {
  console.info('🔍 Validating environment variables...\n');
  const env = process.env[ENV_VARS.NODE_ENV] || 'development';
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
  if (
    process.env[ENV_VARS.SESSION_SECRET] &&
    process.env[ENV_VARS.SESSION_SECRET].length < 32
  ) {
    warnings.push('SESSION_SECRET should be at least 32 characters long');
  }
  if (
    process.env[ENV_VARS.JWT_SECRET] &&
    process.env[ENV_VARS.JWT_SECRET].length < 32
  ) {
    warnings.push('JWT_SECRET should be at least 32 characters long');
  }
  if (
    process.env[ENV_VARS.DATABASE_URL] &&
    !process.env[ENV_VARS.DATABASE_URL].startsWith('postgresql://')
  ) {
    warnings.push('DATABASE_URL should start with postgresql://');
  }

  // Report results
  console.info(`Environment: ${env}`);
  console.info(
    `Total variables checked: ${
      requiredVars.common.length + (requiredVars[env]?.length || 0)
    }`
  );

  if (missing.length === 0) {
    console.info('✅ All required environment variables are set!\n');
  } else {
    console.error(`❌ Missing ${missing.length} required variables:\n`);
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Warnings:\n');
    warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    console.warn('');
  }

  // Check for .env file
  const envFile = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envFile)) {
    console.warn(
      '💡 Tip: No .env file found. Create one by copying .env.example\n'
    );
  }

  // Test database connection
  if (process.env[ENV_VARS.DATABASE_URL]) {
    if (!process.env[ENV_VARS.DATABASE_URL].startsWith('postgresql://')) {
      console.warn(
        '⚠️  DATABASE_URL should start with postgresql://. Please check your configuration.'
      );
    }
    if (!process.env[ENV_VARS.DATABASE_URL].includes('password')) {
      console.warn(
        '⚠️  DATABASE_URL should include password. Please check your configuration.'
      );
    }
    console.info('🔗 Testing database connection...');
    testDatabaseConnection();
  }

  // Test Redis connection
  if (process.env[ENV_VARS.REDIS_URL]) {
    if (!process.env[ENV_VARS.REDIS_URL].startsWith('redis://')) {
      console.warn(
        '⚠️  REDIS_URL should start with redis://. Please check your configuration.'
      );
    }
    if (!process.env[ENV_VARS.REDIS_URL].includes('password')) {
      console.warn(
        '⚠️  REDIS_URL should include password. Please check your configuration.'
      );
    }
    console.info('🔗 Testing Redis connection...');
    testRedisConnection();
  }

  process.exit(missing.length > 0 ? 1 : 0);
}

async function testDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });

    await pool.query('SELECT 1');
    console.info('✅ Database connection successful!\n');
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message, '\n');
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
    console.info('✅ Redis connection successful!\n');
    await client.quit();
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message, '\n');
  }
}

// Load .env file if it exists
require('dotenv').config();

// Run validation
validateEnvironment();
