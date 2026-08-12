const { Pool } = require('pg');
require('dotenv').config();

// Uses DATABASE_URL if provided, otherwise falls back to individual PG* env vars.
// Cloud providers like Neon/Render/Railway require SSL — enabled automatically
// whenever DATABASE_URL is used, unless PGSSL=false is explicitly set (e.g. for
// a local Postgres install that doesn't have SSL configured).
const useSSL = !!process.env.DATABASE_URL && process.env.PGSSL !== 'false';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error', err);
});

module.exports = pool;
