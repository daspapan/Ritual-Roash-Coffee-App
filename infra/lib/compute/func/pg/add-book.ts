import { Client } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const RDS_ARN = process.env.RDS_ARN!;
const CREDENTIALS_ARN = process.env.CREDENTIALS_ARN!;
const DATABASE_NAME = process.env.DATABASE_NAME;
const HOST = process.env.HOST!;

interface IAddEvent {
    isbn: string,
    name: string,
    authors: string[],
    languages: string[],
    countries: string[],
    numberOfPages: number,
    releaseDate: string,
}

let secretsClient: SecretsManagerClient;

exports.handler = async(event:IAddEvent) => {

    console.log("===============[ADD-BOOK]==================")
    
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

        // Retrieve RDS User credentials
        console.log('retrieving library credentials...');
        const commandCredentials = new GetSecretValueCommand({ SecretId: CREDENTIALS_ARN });
        const credentialsSecret = await secretsClient.send(commandCredentials);
        const credentials = JSON.parse(credentialsSecret.SecretString as string) ; 
        console.log(JSON.stringify(credentials))
    
        // Instantiate RDS Client
        console.log('instantiating rds client...');
        const client = new Client({
            host: HOST,
            user: credentials.user,
            password: credentials.password,
            database: DATABASE_NAME,
            port: 5432,
        });


        // Connect to RDS instance
        console.log('connecting to rds...');
        await client.connect();

        console.log('adding book...');
        await client.query(`INSERT INTO library (isbn, name, authors, languages, countries, numberOfPages, releaseDate) VALUES('${
            event.isbn
        }', '${
            event.name
        }', '{${
            event.authors
        }}', '{${
            event.languages
        }}', '{${
            event.countries
        }}', '${
            event.numberOfPages
        }', '${
            event.releaseDate
        }')`);

        // Break connection
        console.log('tasks completed!');
        await client.end();
        
    } catch (error) {
        
    }
}