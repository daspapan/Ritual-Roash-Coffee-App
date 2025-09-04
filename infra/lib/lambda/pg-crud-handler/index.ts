import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client, Pool } from 'pg';

const APP_NAME = process.env.APP_NAME!;

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
        console.log('Received event:', JSON.stringify(event, null, 2));

        const secretArn = process.env.RDS_SECRET_ARN;
        const initialDbName = process.env.DB_NAME || 'postgres'; // Master DB name

        if (!secretArn || !initialDbName) {
            throw new Error('Missing required properties: RDS_SECRET_ARN or DB_NAME.');
        }

        const secret = await getDbSecret(secretArn);
        const client = await getDbClient(secret, initialDbName);

        console.log(`[Event Path/Method]: ${event.path} -> ${event.httpMethod}`);

        if (event.path === '/crud/ping' && event.httpMethod === 'GET') {

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
                body: JSON.stringify({ message: `Pong from ${APP_NAME} Lambda Function for CRUD Operation.`, timestamp: istDateTime }),
            };
        } else if (event.path === '/crud' && event.httpMethod === 'POST') { 


            // Add a new product
            const body = JSON.parse(event.body || '{}');
            const { name, description, price, imageUrl } = body;
            if (!name || !price) {
                return { statusCode: 400, body: JSON.stringify({ message: 'Name and price are required.' }) };
            }

            const result = await client.query(
                'INSERT INTO public.products (name, description, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *;',
                [name, description, price, imageUrl]
            );
            return {
                statusCode: 201,
                body: JSON.stringify({ message: 'Product added successfully', product: result.rows[0] }),
            };

        } else if (event.path === '/crud' && event.httpMethod === 'GET') { 

            const result = await client.query('SELECT * FROM public.products;');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Product read successfully', products: result.rows }),
            };

        } else if (event.path.startsWith('/crud/') && event.httpMethod === 'GET') { 

            // Get product by ID
            const productId = event.pathParameters?.id; // Assuming /products/{id} path
            if (!productId || isNaN(parseInt(productId))) {
                return { statusCode: 400, body: JSON.stringify({ message: 'Invalid CRUD Operation ID.' }) };
            }

            const result = await client.query('SELECT * FROM public.products WHERE id = $1;', [parseInt(productId)]);

            if (result.rows.length === 0) {
                return { statusCode: 404, body: JSON.stringify({ message: 'Product not found.' }) };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Read one item successfully.', products: result.rows[0]}),
            };

        } else if (event.path.startsWith('/crud/') && event.httpMethod === 'PUT') { 

            // Get product by ID
            const productId = event.pathParameters?.id; // Assuming /products/{id} path
            if (!productId || isNaN(parseInt(productId))) {
                return { statusCode: 400, body: JSON.stringify({ message: 'Invalid CRUD Operation ID.' }) };
            }

            // Update existing product
            const body = JSON.parse(event.body || '{}');
            const { name, description, price, imageUrl } = body;

            const result = await client.query('UPDATE public.products SET name = $2, description = $3, price = $4, image_url = $5 WHERE id = $1 RETURNING *;', [parseInt(productId), name, description, price, imageUrl]);

            if (result.rows.length === 0) {
                return { statusCode: 404, body: JSON.stringify({ message: 'Product not found.' }) };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Update successfully.', products: result.rows[0]}),
            };

        } else if (event.path.startsWith('/crud/') && event.httpMethod === 'DELETE') { 

            // Get product by ID
            const productId = event.pathParameters?.id; // Assuming /products/{id} path
            if (!productId || isNaN(parseInt(productId))) {
                return { statusCode: 400, body: JSON.stringify({ message: 'Invalid CRUD Operation ID.' }) };
            }

            const result = await client.query('DELETE FROM public.products WHERE id = $1 RETURNING *;', [parseInt(productId)]);

            if (result.rows.length === 0) {
                return { statusCode: 404, body: JSON.stringify({ message: 'Product not found.' }) };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Delete successfully.', products: result.rows[0]}),
            };

        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Not Found' }),
        };

    } catch (error: any) {
        console.error('PG Crud Ops Handler Lambda Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
}