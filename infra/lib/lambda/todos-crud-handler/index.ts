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

    // console.log("[DATABASE_URL]", `postgres://${secret.username}:${secret.password}@${dbEndpoint}:${dbPort}/${dbName}`)

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

        console.log(`[Event: Method -> Path]: ${event.httpMethod} -> ${event.path}`);

        let parsedBody: any;
        if (event.body && event.isBase64Encoded) {
            const decodedBody = Buffer.from(event.body, 'base64').toString('utf8');
            try {
                parsedBody = JSON.parse(decodedBody);
            } catch (error) {
                // Handle JSON parsing error
                return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body', error }) };
            }
        } else if (event.body) {
            try {
                parsedBody = JSON.parse(event.body);
            } catch (error) {
                // Handle JSON parsing error
                return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body', error }) };
            }
        }


        console.log("[BODY]", parsedBody)

        // Now use parsedBody for your logic based on HTTP method
        switch (event.httpMethod) {

            case 'POST':
                // Add a new todo
                if (event.path === '/todos'){

                    const { title, description, start_date, due_date, remark, status, priority, assignee } = parsedBody;

                    if (!title.trim() || !description) {
                        return { statusCode: 400, body: JSON.stringify({ message: 'Name and description are required.' }) };
                    }

                    const query = `
                        INSERT INTO public.todos (
                        title,
                        description,
                        start_date,
                        due_date,
                        status,
                        priority,
                        assignee,
                        remark
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING *;
                    `;

                    const values = [
                        title,
                        description,
                        start_date || null,
                        due_date || null,
                        status || 'TODO',
                        priority || 'LOW',
                        assignee || 'self',
                        remark || null,
                    ];

                    const result = await client.query(query,values);

                    return {
                        statusCode: 201,
                        body: JSON.stringify({ message: 'Todo added successfully', product: result.rows[0] }),
                    };
                }
                return { statusCode: 404, body: JSON.stringify({ message: 'Method Not Found' }) };

            case 'GET':
                if (event.path === '/todos/ping'){

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
                        body: JSON.stringify({ message: `Pong from ${APP_NAME} Lambda Function for TODOs CRUD Operation.`, timestamp: istDateTime }),
                    };

                }else if(event.path === '/todos'){

                    const result = await client.query('SELECT * FROM public.todos ORDER BY updated_at DESC;');
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ message: 'Todos read successfully', todos: result.rows }),
                    };

                }else if(event.path.startsWith('/todos/')){

                    // Get product by ID
                    const todoId = event.pathParameters?.id; // Assuming /products/{id} path
                    if (!todoId || isNaN(parseInt(todoId))) {
                        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid CRUD Operation Todos ID.' }) };
                    }

                    const result = await client.query('SELECT * FROM public.todos WHERE id = $1;', [parseInt(todoId)]);

                    if (result.rows.length === 0) {
                        return { statusCode: 404, body: JSON.stringify({ message: 'Todo not found.' }) };
                    }

                    return {
                        statusCode: 200,
                        body: JSON.stringify({ message: 'Read one todo item successfully.', products: result.rows[0]}),
                    };

                }

                return { statusCode: 404, body: JSON.stringify({ message: 'Method Not Found' }) };

            case "PUT":

                if (event.path.startsWith('/todos/')){

                    // Get product by ID
                    const todoId = event.pathParameters?.id; // Assuming /products/{id} path
                    if (!todoId || isNaN(parseInt(todoId))) {
                        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid CRUD Operation Todo ID.' }) };
                    }

                    // Update existing product
                    // const body = JSON.parse(event.body || '{}');
                    const { title, description, start_date, due_date, remark } = parsedBody;

                    const result = await client.query('UPDATE public.todos SET title = $2, description = $3, start_date = $4, due_date = $5, remark = $6 WHERE id = $1 RETURNING *;', [parseInt(todoId), title, description, start_date, due_date, remark]);

                    if (result.rows.length === 0) {
                        return { statusCode: 404, body: JSON.stringify({ message: 'Todo not found.' }) };
                    }

                    return {
                        statusCode: 200,
                        body: JSON.stringify({ message: 'Todo update successfully.', products: result.rows[0]}),
                    };

                }

                return { statusCode: 404, body: JSON.stringify({ message: 'Method Not Found' }) };

            case "DELETE":

                if (event.path.startsWith('/todos/')){

                    // Get todo by ID
                    const todoId = event.pathParameters?.id; // Assuming /products/{id} path
                    if (!todoId || isNaN(parseInt(todoId))) {
                        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid CRUD Operation Todo ID.' }) };
                    }

                    const result = await client.query('DELETE FROM public.todos WHERE id = $1 RETURNING *;', [parseInt(todoId)]);

                    if (result.rows.length === 0) {
                        return { statusCode: 404, body: JSON.stringify({ message: 'Todo not found.' }) };
                    }

                    return {
                        statusCode: 200,
                        body: JSON.stringify({ message: 'Delete successfully.', products: result.rows[0]}),
                    };

                }

                return { statusCode: 404, body: JSON.stringify({ message: 'Method Not Found' }) };

            default:
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Not Found' }),
                };

        }

    } catch (error: any) {
        console.error('TODO Crud Ops Handler Lambda Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
}