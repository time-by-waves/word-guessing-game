#!/usr/bin/env node

const { pgPool } = require('../src/db/config');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
  console.info('Running database migrations...');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', '.devcontainer', 'init.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    // Execute the SQL
    await pgPool.query(sql);
    console.info('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
