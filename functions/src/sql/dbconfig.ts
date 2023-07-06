import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let client: PoolClient | undefined = undefined;
export async function getPoolClient(): Promise<PoolClient> {
    if (!client) {
        const pool = new Pool ({
            max: 20,
            connectionString: process.env.POSTGRES_CONNECTION_STRING,
            idleTimeoutMillis: 30000
        });
        client = await pool.connect();
    }
    return client;
}