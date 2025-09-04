"use server"

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidatePath } from "next/cache";
import {pool} from "@/utils/pg"
import path from "path";
import { writeFile } from "fs/promises";
import axios from "axios";
import { error } from "console";
import { Client, ClientConfig } from "pg";
import { ConnectionOptions } from "tls";
import { v4 as uuidv4 } from 'uuid';


const s3Client = new S3Client({ region: process.env.AWS_REGION });
let dbClient: Client | null = null;

const pgHost = process.env.POSTGRES_HOST;
const pgPort = process.env.POSTGRES_PORT || "5432";
const dbName = process.env.POSTGRES_DB;
const dbUser = process.env.POSTGRES_USER;
const dbPass = process.env.POSTGRES_PASS;
const connectionString = process.env.DATABASE_URL;
const FILE_STORAGE = process.env.NEXT_PUBLIC_FILE_STORAGE || "S3";
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || undefined;
const BUCKET_NAME = process.env.S3_BUCKET_NAME || null;

console.log("[connectionString]", connectionString)
// console.log("[process.env]", JSON.stringify(process.env, null, 2))
console.log("[FILE_STORAGE]", FILE_STORAGE)
console.log("[PLATFORM]", PLATFORM)
console.log("[dbUser]", dbUser)
console.log("[BUCKET_NAME]", BUCKET_NAME)
console.log("[dbName]", dbName)

// const APIGW = 'https://10n0ejfwhe.execute-api.ap-south-1.amazonaws.com/dev/';
const maxSizeInBytes = 5 * 1024 * 1024; // 5MB File Size

export type Todostatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TodoInput {
    id: string;
    title: string;
    description?: string;
    start_date?: Date;
    due_date?: Date;
    status: Todostatus;
    priority: TodoPriority;
    assignee?: string;
    remark?: string;
    storage?:string;
    content_type?:string;
    attachment?: string;
}


async function getDbClient(): Promise<Client> {
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

    // const dbEndpoint = process.env.RDS_ENDPOINT || secret.host;
    // const dbPort = parseInt(process.env.RDS_PORT || '5432');
    if (!pgHost) throw new Error('DATABASE_URL environment variable is not set.');

    const connectionOption : ConnectionOptions = {
        rejectUnauthorized: false
    }

    dbClient = new Client({
        // connectionStri,
        host: pgHost,
        port: parseInt(pgPort),
        user: dbUser,
        password: dbPass,
        database: dbName,
        // For production, you MUST provide the CA certificate for SSL
        // ca: fs.readFileSync('/opt/rds-ca-bundle.pem').toString(), // If bundled as layer
        ssl: PLATFORM === "awscloud" ? connectionOption:false // Set to true in prod with proper CA cert
    });
    await dbClient.connect();
    console.log(`Successfully connected to database: ${dbName}.`);
    return dbClient;

}

export async function addTask(formData: FormData){
    console.log("Adding Task ...")
    console.log(JSON.stringify(formData, null, 2))
}

export async function getEnvVar(): Promise<NodeJS.ProcessEnv> {
    return Promise.resolve(process.env);
}

export async function getPlatformName():Promise<String | undefined> {
    return process.env.PLATFORM ? process.env.PLATFORM : PLATFORM
}

export async function getTodos(page = 1, limit = 10):Promise<TodoInput[]>{

    const offset = (page - 1) * limit;

    const client = await getDbClient();
    const res = await client.query("SELECT * FROM public.todos ORDER BY updated_at DESC;");
    return res.rows;

}

export async function createTodo(formData: FormData){

    console.log("Creating a new Task ...")
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const start_date = formData.get('start_date') as string;
    const due_date = formData.get('due_date') as string;
    const remark = formData.get('remark') as string;
    const status = 'TODO'
    const priority = 'LOW'
    const assignee = 'self'

    // console.log("[Input Received]", input)

    if(!title.trim()){
        return ;
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
        description || null,
        start_date || null,
        due_date || null,
        status,
        priority,
        assignee,
        remark || null,
    ];

    try {
        const client = await getDbClient();
        const res = await client.query(query, values);
        console.log('Inserted Todo:', res.rows[0]);
        return res.rows[0];
    } catch (error) {
        console.error('Error inserting todo:', error);
        throw error;
    } finally {
        revalidatePath("/")
    }

}

export async function updateTodo(formData: FormData){

    console.log("Update a Task ...")

    const id = formData.get('id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const start_date = formData.get('start_date') as string || undefined;
    const due_date = formData.get('due_date') as string || undefined;
    const remark = formData.get('remark') as string;
    // const content_type = formData.get('content_type') as string || undefined;
    // const attach_file = formData.get('select_file') as File;
    // const status = 'TODO'
    // const priority = 'LOW'
    // const assignee = 'self'

    console.log(id, title, description, start_date, due_date, remark)

    // Convert FormData to a plain object
    const formObject: Record<string, any> = Object.fromEntries(formData.entries());
    const fields = [];
    const values = [];
    let i = 1;

    // Now you can use Object.entries
    /* for (const [key, value] of Object.entries(formObject)) {
      console.log(`${key}: ${value}`);
    } */

    

    console.log("[formObject]:", formObject)
    for (const [key, value] of Object.entries(formObject)) {
        if (key !== 'id' && value !== undefined) {
            fields.push(`${key} = $${i}`);
            values.push(value);
            i++;
        }
    }

    if (fields.length === 0) {
        console.log('No fields to update.');
        return;
    }

    const query = `
        UPDATE public.todos
        SET ${fields.join(', ')},
            updated_at = NOW()
        WHERE id = $${i}
        RETURNING *;
    `;
    values.push(id);
    // console.log("[QUERY]", query)
    // console.log("[VALUES]", values)
    

    try {
        const client = await getDbClient();
        const res = await client.query(query, values);
        if (res.rows.length === 0) {
            console.log('No todo found with this ID.');
            return { message: `No item found with this id.`}
        } else {
            console.log('Updated Todo:', res.rows[0]);
            return { message: `Update successful.`, todo: res.rows[0]}
        }
        
    } catch (error) {

        console.error('Error updating todo:', error);
        throw error;

    }finally {

        revalidatePath("/")
    }

}




export async function changeStatus(formData: FormData){

    console.log("Changing a Task ...")

    const todoId = formData.get('todoId') as string;

    console.log(todoId)


    revalidatePath("/")

}


export async function deleteTodo(formData: FormData){

    console.log("Deleting a Task ...")

    const id = formData.get('id') as string;

    const query = `
        DELETE FROM public.todos WHERE id = $1
        RETURNING *;
    `;

    const values = [id]

    try {
        const client = await getDbClient();
        const res = await client.query(query, values);
        console.log('Delete Todo:', res.rows[0]);
        return res.rows[0];
        
    } catch (error) {

        console.error('Error deleting todo:', error);
        throw error;
        
    }finally {

        revalidatePath("/")
    }
}

export async function uploadAttachment(formData: FormData){

    const file = formData.get('select_file') as File; 
    const todoId = formData.get('todoId') as string;
    let query: string;


    try {

        if (file instanceof File) {

            // You can now work with the file object
            console.log('File name:', file.name);
            console.log('File type:', file.type);
            console.log('File size:', file.size);

            if(file.size > maxSizeInBytes){

                console.log('Maximum file sized reached. File not allowed.')

            }else{


                console.log(`[File Storage]: ${FILE_STORAGE}`) // 

                if(FILE_STORAGE === "local"){

                    const bytes = await file.arrayBuffer();
                    const buffer = Buffer.from(bytes);

                    const uploadDir = path.join(process.cwd(), 'public', 'uploads'); // Save to public/uploads
                    const formattedString: string = file.name.replace(/\s/g, "").toLowerCase();
                    const fileName: string = `${uuidv4()}-${formattedString}`
                    const filePath = path.join(uploadDir, fileName);

                    await writeFile(filePath, buffer);

                    query = `
                        UPDATE public.todos
                        SET storage = 'LOCAL', content_type = '${file.type}', attachment = 'uploads/${fileName}',
                            updated_at = NOW()
                        WHERE id = '${todoId}'
                        RETURNING *;
                    `;

                    const client = await getDbClient();
                    await client.query(query);

                }else if(FILE_STORAGE === "S3"){

                    if(!BUCKET_NAME){
                        console.log("NO S3 BUCKET NAME.")
                        throw error;
                    }

                    const originalFileName = file.name; // let formattedString: string = originalString.replace(/\s/g, "").toLowerCase();
                    const formattedString: string = originalFileName.replace(/\s/g, "").toLowerCase();
                    const fileExtension = originalFileName.split('.').pop();
                    // Construct a unique S3 key using ProductId and a UUID
                    const s3Key = `attachments/${todoId}/${uuidv4()}-${formattedString}`;

                    const bytes = await file.arrayBuffer();
                    const buffer = Buffer.from(bytes);

                    const putCommand = new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: s3Key,
                        Body: buffer,
                        ContentType: file.type,
                        Metadata: {
                            'todo-id': todoId,
                            'original-file-name': originalFileName,
                            'formatted-file-name': formattedString,
                        }
                    });
        
                    const response = s3Client.send(putCommand)
        
                    console.log(`File Uploaded successfully!\nFile "${file.name}" for Todo ID "${todoId}" uploaded successfully! \nS3 Key: ${s3Key}`);
                    console.log(JSON.stringify(response, null, 2))

                    query = `
                        UPDATE public.todos
                        SET storage = 'S3', content_type = '${file.type}', attachment = '${s3Key}',
                            updated_at = NOW()
                        WHERE id = '${todoId}'
                        RETURNING *;
                    `;

                    const client = await getDbClient();
                    await client.query(query);
                }
            }

        }else{

            console.log('No file was uploaded or an invalid type was received.');
            return;

        }
    }catch (error) {

        console.error('Error uploading file:', error);
        throw error;
        
    }finally{

        revalidatePath("/")

    }

}

export async function getPreSignedUrl(s3Key:string):Promise<string | undefined>{

    if (!s3Key) {
        console.log('s3Key is required.');
        return undefined
    }

    if(!BUCKET_NAME){
        console.log("NO S3 BUCKET NAME...")
        return undefined;
    }

    try {

        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        });

        const presignedUrl = await getSignedUrl(s3Client, getCommand, {
            expiresIn: 300 // URL expires in 5 minutes
        });

        return presignedUrl
        
    } catch (error) {

        console.error('Error getting pre signed url.', error);
        throw error;
        
    }

}

export async function uploadFile(formData: FormData){

    // const APIGW = 'https://10n0ejfwhe.execute-api.ap-south-1.amazonaws.com/dev/';
    // const maxSizeInBytes = 5 * 1024 * 1024; // 5MB File Size

    const file = formData.get('select_file') as File; // 'myFileField' is the name attribute of your <input type="file">
    // document.getElementById('file-input') as HTMLInputElement;
    const productId = formData.get('productId') as string;
    const fileName = formData.get('fileName') as string;
    const contentType = formData.get('contentType') as string;
      
    try {

        if (file instanceof File) {

            // You can now work with the file object
            // console.log('File name:', file.name);
            // console.log('File type:', file.type);
            // console.log('File size:', file.size);

            if(file.size > maxSizeInBytes){

                console.log('Maximum file sized reached. File not allowed.')

            }else{

                const response = await fetch(`${process.env.APIGW}media/upload-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.name,
                        contentType: file.type,
                        productId
                    }),
                });
    
                const { presignedUrl, s3Key } = await response.json();
    
                await fetch(`${presignedUrl}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file,
                });
    
                console.log(`File Uploaded successfully!\nFile "${file.name}" for Product ID "${productId}" uploaded successfully! \nS3 Key: ${s3Key}`);
            }


        } else {
            console.log('No file was uploaded or an invalid type was received.');
            return;
        }
        
    } catch (error) {

        console.error('Error uploading file:', error);
        throw error;
        
    }
}