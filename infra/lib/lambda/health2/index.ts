import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client, Pool } from 'pg';

const APP_NAME = process.env.APP_NAME!;

let secretsClient: SecretsManagerClient;
let dbClient: Client | null = null;

const pool = new Pool({
    user: 'dbuser',
    host: 'rrc-dev-db-instance.c6rebnexgqyq.ap-south-1.rds.amazonaws.com',
    database: 'todoslist',
    password: 'E1QSrvxBp8S4pFJkiuWzLzC99nEnva2P',
    port: 5432, // Default to 5432 if not set
});


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
    const dbEndpoint = process.env.RDS_ENDPOINT || secret.host;
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


export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        console.log('Received v4 event:', JSON.stringify(event, null, 2));

        if (event.path === '/health2/ping2' && event.httpMethod === 'GET') {

            const secretArn = process.env.RDS_SECRET_ARN || '';
            const secret = await getDbSecret(secretArn);
            console.log("[SECRET]", JSON.stringify(secret, null, 2))


            const client = await getDbClient(secret, 'todoslist');
            console.log("[CLIENT]", JSON.stringify(client, null, 2))

            // const client = await pool.connect();
            // console.log('Connected to PostgreSQL successfully!');
            // client.release();

            const now = new Date();

            // Format the date and time to IST using toLocaleString.
            // 'en-IN' specifies the locale for India, and 'Asia/Kolkata' specifies the timezone.
            const istDateTime = now.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour12: false // Use 24-hour format
            });
            

            return {
                statusCode: 200,
                body: JSON.stringify({ message: `Pong from ${APP_NAME} Lambda Function. V2`, timestamp: istDateTime }),
            };
        } 

        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Not Found' }),
        };
    } catch (error: any) {
        console.error('Image Handler Lambda Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
}