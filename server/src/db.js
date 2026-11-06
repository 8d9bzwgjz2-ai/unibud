import pg from 'pg';

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://unibud:unibud_dev_pw@localhost:5432/unibud',
  max: 10,
});

export const q = (text, params) => pool.query(text, params);
