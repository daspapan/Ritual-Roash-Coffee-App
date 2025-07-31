import { Pool } from 'pg';

export const pool = new Pool({
    user: process.env.POSTGRES_USER || 'admin',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'todoslist',
    password: process.env.POSTGRES_PASS || 'admin',
    port: 5432,
});