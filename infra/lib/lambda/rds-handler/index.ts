import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from 'pg';
import { CdkCustomResourceEvent, CdkCustomResourceResponse, Context } from 'aws-lambda';

let secretsClient: SecretsManagerClient;
let dbClient: Client | null = null;

interface DbSecret {
    username?: string;
    password?: string;
    engine?: string;
    host?: string;
    port?: number;
}

async function getDbSecret(secretArn: string): Promise<DbSecret> {
    if (!secretsClient) {
        secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
    }
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const data = await secretsClient.send(command);
    if ('SecretString' in data && data.SecretString) {
        return JSON.parse(data.SecretString) as DbSecret;
    }
    throw new Error('SecretString not found in Secrets Manager response.');
}

async function getDbClient(secret: DbSecret, dbName: string): Promise<Client> {
    if (dbClient && !dbClient.end && dbClient.database === dbName) {
        console.log(`Reusing existing database connection to ${dbName}.`);
        return dbClient;
    }

    if (dbClient && !dbClient.end) { // Disconnect if connected to a different DB
        console.log(`Disconnecting from ${dbClient.database} to connect to ${dbName}.`);
        await dbClient.end();
        dbClient = null;
    }

    console.log(`Establishing new database connection to ${dbName}...`);
    const dbEndpoint = process.env.RDS_ENDPOINT;
    const dbPort = parseInt(process.env.RDS_PORT || '5432');
    if (!dbEndpoint) throw new Error('RDS_ENDPOINT environment variable is not set.');

    dbClient = new Client({
        host: dbEndpoint,
        port: dbPort,
        user: secret.username,
        password: secret.password,
        database: dbName,
        // For production, you MUST provide the CA certificate for SSL
        // ca: fs.readFileSync('/opt/rds-ca-bundle.pem').toString(), // If bundled as layer
        ssl: { rejectUnauthorized: false } // Set to true in prod with proper CA cert
    });
    await dbClient.connect();
    console.log(`Successfully connected to database: ${dbName}.`);
    return dbClient;
}

export async function handler(event: CdkCustomResourceEvent, context: Context): Promise<CdkCustomResourceResponse> {

    console.log('[event.ResourceProperties]', JSON.stringify(event.ResourceProperties, null, 2))

    const response: CdkCustomResourceResponse = {
        Status: 'SUCCESS',
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: context.logGroupName,
        StackId: event.StackId,
    };

    try {
        const secretArn = process.env.RDS_SECRET_ARN; // event.ResourceProperties.RDS_SECRET_ARN;
        const sqlCommands = event.ResourceProperties.sqlCommands as string[];
        const initialDbName = process.env.INITIAL_DB_NAME || 'postgres'; // Master DB name

        if (!secretArn || !sqlCommands || !Array.isArray(sqlCommands)) {
            throw new Error('Missing required properties: RDS_SECRET_ARN or sqlCommands.');
        }

        console.log(`Request Type: ${event.RequestType}`);

        const secret = await getDbSecret(secretArn);
        const client = await getDbClient(secret, initialDbName);

        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
            for (const sql of sqlCommands) {
                try {
                    console.log(`Executing SQL: ${sql}`);
                    await client.query(sql);
                    console.log('SQL executed successfully.');
                } catch (sqlError: any) {
                    if (sqlError.code === '42P04' && sql.includes('CREATE DATABASE')) {
                        console.warn(`Database already exists: ${sqlError.message}`);
                    } else if (sqlError.code === '42710' && sql.includes('CREATE USER')) {
                        console.warn(`User/Role already exists: ${sqlError.message}`);
                    } else if (sqlError.code === '42P07' && sql.includes('CREATE TABLE')) { // 42P07: duplicate_table
                        console.warn(`Table already exists: ${sqlError.message}`);
                    }
                    else {
                        throw new Error(`SQL execution failed: ${sqlError.message} (SQL: ${sql})`);
                    }
                }
            }
        } else if (event.RequestType === 'Delete') {
            console.log('Delete operation: No specific database/user/table cleanup implemented for safety.');
            // Add DROP statements here if you want to clean up, but be very cautious
        }
    } catch (error: any) {
        console.error('Custom Resource Handler Error:', error);
        response.Status = 'FAILED';
        response.Reason = error.message;
        response.PhysicalResourceId = context.logGroupName;
    } finally {
        if (dbClient) {
            try {
                await dbClient.end();
                console.log('Database connection closed.');
            } catch (closeError) {
                console.error('Error closing DB connection:', closeError);
            }
        }
    }
    return response;
}