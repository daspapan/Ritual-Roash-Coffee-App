import { Client } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const RDS_ARN = process.env.RDS_ARN!;
const CREDENTIALS_ARN = process.env.CREDENTIALS_ARN!;
const DATABASE_NAME = process.env.DATABASE_NAME;

let secretsClient: SecretsManagerClient;

interface DbSecret {
    username?: string;
    password?: string;
    engine?: string;
    host?: string;
    port?: number;
    dbInstanceIdentifier?: string;
    // Add other properties as per your secret structure
}

exports.handler = async() => {

    console.log("===============[INSTANTIATE]==================")
    
    console.log("Environment...", JSON.stringify(process.env, null, 2))

    console.log("=============================================")

    if (!secretsClient) {
        secretsClient = new SecretsManagerClient();
    }

    const secretArn = process.env.CREDENTIALS_ARN;
    if (!secretArn) {
        throw new Error('CREDENTIALS_ARN environment variable is not set.');
    }

    
    try {

        // Retrieve RDS Admin credentials
        console.log('retrieving admin credentials...');
        const commandAdminSecret = new GetSecretValueCommand({ SecretId: RDS_ARN });
        const adminSecret = await secretsClient.send(commandAdminSecret);
        let admin:DbSecret = {};
        if ('SecretString' in adminSecret && adminSecret.SecretString) {
            admin = JSON.parse(adminSecret.SecretString) as DbSecret; 
        }else{
            throw new Error('SecretString not found in Secrets Manager response.');
        }
        console.log(JSON.stringify(admin))
        

        // Retrieve RDS User credentials
        console.log('retrieving library credentials...');
        // const credentialsSecret = await secrets.getSecretValue({ SecretId: CREDENTIALS_ARN }).promise();
        // const credentials = JSON.parse(credentialsSecret.SecretString as string);
        const commandCredentials = new GetSecretValueCommand({ SecretId: CREDENTIALS_ARN });
        const credentialsSecret = await secretsClient.send(commandCredentials);
        const credentials = JSON.parse(credentialsSecret.SecretString as string) ; 
        console.log(JSON.stringify(credentials))

        // Instantiate RDS Client with Admin
        console.log('instantiating client with admin...');
        const client = new Client({
            host: admin.host,
            user: admin.username,
            password: admin.password,
            database: 'postgres',
            port: 5432,
        });

        // Connect to RDS instance with Admin
        console.log('connecting to rds with admin...');
        await client.connect();
        console.log('setting up new database...');
        await client.query(`CREATE DATABASE ${DATABASE_NAME};`);
        await client.query(`CREATE USER ${credentials.user} WITH PASSWORD '${credentials.password}';`);
        await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${DATABASE_NAME} TO ${credentials.user};`);
        console.log('setup completed!');
        await client.end();


        // Instantiate RDS Client with new user
        console.log('instantiating client with new user...');
        const userClient = new Client({
            host: admin.host,
            user: credentials.user,
            password: credentials.password,
            database: `${DATABASE_NAME}`,
            port: 5432,
        });

        // Connect to RDS instance
        console.log('connecting to rds with new user...');
        await userClient.connect();
        console.log('creating new table...');
        const createTableCommand = [
            'CREATE TABLE library (',
            'isbn VARCHAR(50) UNIQUE NOT NULL, ',
            'name VARCHAR(50) NOT NULL, ',
            'authors VARCHAR(50)[] NOT NULL, ',
            'languages VARCHAR(50)[] NOT NULL, ',
            'countries VARCHAR(50)[] NOT NULL, ',
            'numberOfPages integer, ',
            'releaseDate VARCHAR(50) NOT NULL);',
        ]
        await userClient.query(createTableCommand.join(''))


        console.log('tasks completed!');
        await userClient.end();

    } catch (error) {

        console.error('Error creating database:', error);
        throw error;

    }

}

