// lambda/create-tables/index.ts
import { Client } from 'pg'; // or 'mysql2', 'tedious', etc.
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

exports.handler = async (event: any) => {
    const secretArn = process.env.DB_SECRET_ARN;
    const endpoint = process.env.DB_ENDPOINT;

    if (!secretArn || !endpoint) {
        throw new Error('DB_SECRET_ARN and DB_ENDPOINT environment variables are required.');
    }

    const secretsManager = new SecretsManagerClient({});
    const secretData = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn }));
    const credentials = JSON.parse(secretData.SecretString || '{}');

    console.log(secretArn, endpoint, credentials.username, credentials.password)

    const client = new Client({
        host: endpoint,
        user: credentials.username,
        password: credentials.password,
        database: 'postgres', // Or your specific database name
    });

    try {
        await client.connect();
        await client.query(`
            CREATE TYPE "TodoStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
            CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
            CREATE TABLE IF NOT EXISTS todos (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                start_date TIMESTAMP,
                due_date TIMESTAMP,
                status "TodoStatus" NOT NULL DEFAULT 'TODO',
                priority "TodoPriority" NOT NULL DEFAULT 'LOW',
                assignee TEXT NOT NULL DEFAULT 'self',
                remark TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Table "todos" created successfully.');
        return { statusCode: 200, body: 'Table created' };
    } catch (error) {
        console.error('Error creating table:', error);
        return { statusCode: 500, body: 'Error creating table' };
    } finally {
        await client.end();
    }
};