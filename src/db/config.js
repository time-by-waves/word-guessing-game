const { Pool } = require('pg');
const Redis = require('redis');

// PostgreSQL configuration
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
});

// Redis configuration
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
  socket: {
    reconnectStrategy: retries => {
      if (retries > 10) {
        console.error('Redis: Too many reconnect attempts');
        return new Error('Too many reconnect attempts');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

// Redis event handlers
redisClient.on('error', err => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.info('Connected to Redis');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

// Database query helper
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pgPool.query(text, params);
    const duration = Date.now() - start;
    console.info('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Transaction helper
const transaction = async callback => {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Ping PostgreSQL
const pingPg = async () => {
  try {
    await pgPool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('PostgreSQL ping failed:', error);
    return false;
  }
};

// Ping Redis
const pingRedis = async () => {
  if (!redisClient.isOpen) {
    // isOpen is true if the client is connected or trying to reconnect
    // isReady is true only if the client is connected and ready for commands
    // For a health check, if it's not even 'open', it's an issue.
    // However, ping will fail if not connected, which is a better test.
    console.warn('Redis client is not open. Attempting ping anyway.');
  }
  try {
    const reply = await redisClient.ping();
    return reply === 'PONG';
  } catch (error) {
    console.error('Redis ping failed:', error);
    return false;
  }
};

module.exports = {
  pgPool,
  redisClient,
  connectRedis,
  query,
  transaction,
  pingPg,
  pingRedis,
};
