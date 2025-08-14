import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// import { v4 as uuidv4 } from 'uuid'; // For generating unique file names

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.IMAGE_BUCKET_NAME!;

type payload = {
    fileName: string;
    contentType: string;
    productId: string;
    content: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        console.log('Received event:', JSON.stringify(event, null, 2));

        if (!BUCKET_NAME) {
            throw new Error('IMAGE_BUCKET_NAME environment variable is not set.');
        }

        console.log("[Passed 01]")

        if (event.path === '/media/upload-url' && event.httpMethod === 'PUT') {
            console.log("[Passed 01 01]")
            const body = JSON.parse(event.body || '{}');
            console.log(`[BODY] ${body}`)
            const { fileName, contentType, productId, content } = body; // Optional: associate with product
            if (!fileName || !contentType || !content) {
                return { statusCode: 400, body: JSON.stringify({ message: 'fileName, content and contentType are required.' }) };
            }

            console.log("[Passed 01 02]")
            const now = new Date();
            const fileExtension = fileName.split('.').pop();
            const uniqueFileName = `${now.getTime()}.${fileExtension}`;
            console.log(`uploads/${productId || 'general'}/${uniqueFileName}`)
            const s3Key = `${uniqueFileName}`; // Organize by product ID
            const contentBody = content;

            console.log("[Passed 01 03]")
            const putCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: contentBody,
                ContentType: contentType,
                // Add any metadata you need, e.g., 'Metadata: { ProductId: productId }'
            });

            console.log("[Passed 01 04]")
            const presignedUrl = await getSignedUrl(s3Client, putCommand, {
                expiresIn: 300 // URL expires in 5 minutes
            });

            console.log("[Passed 01 05]")
            return {
                statusCode: 200,
                body: JSON.stringify({ presignedUrl, s3Key }),
            };
        } else if (event.path === '/images/download-url' && event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { s3Key } = body;
            if (!s3Key) {
                return { statusCode: 400, body: JSON.stringify({ message: 's3Key is required.' }) };
            }

            const getCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
            });

            const presignedUrl = await getSignedUrl(s3Client, getCommand, {
                expiresIn: 300 // URL expires in 5 minutes
            });

            return {
                statusCode: 200,
                body: JSON.stringify({ presignedUrl }),
            };
        }

        console.log("[Passed 02]")

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