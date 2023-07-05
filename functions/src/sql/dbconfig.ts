import { Pool } from 'pg';
import dotenv from 'dotenv';
// import { Client } from 'pg-query';

dotenv.config();

export default new Pool ({
    max: 20,
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
    idleTimeoutMillis: 30000
});

// export default new Client({
//     host: '35.202.27.76',
//     user: 'postgres',
//     password: 'mSbDnxvEQKvRhm',
//     database: 'postgres',
//   });