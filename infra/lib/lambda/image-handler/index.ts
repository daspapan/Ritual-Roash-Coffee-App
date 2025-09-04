import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names
// import * as parser from "lambda-multipart-parser"; 

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.IMAGE_BUCKET_NAME!;

type payload = {
    filename: string;
    contentType?: string;
    productId: string;
    content?: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        console.log('Received event:', JSON.stringify(event, null, 2));

        if (!BUCKET_NAME) {
            throw new Error('IMAGE_BUCKET_NAME environment variable is not set.');
        }


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


        // Now use parsedBody for your logic based on HTTP method
        switch (event.httpMethod) {

            case 'POST':
                if (event.path === '/media/upload-url'){

                    const { filename, productId, contentType } = parsedBody as payload;

                    const originalFileName = filename;
                    const fileExtension = originalFileName.split('.').pop();
                    // Construct a unique S3 key using ProductId and a UUID
                    const s3Key = `products/${productId}/${uuidv4()}-${originalFileName}`;


                    const putCommand = new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: s3Key,
                        ContentType: contentType
                    });

                    /* Metadata: {
                        'product-id': productId,
                        'original-file-name': filename,
                    }, */


                    const presignedUrl = await getSignedUrl(s3Client, putCommand, {
                        expiresIn: 300 // URL expires in 5 minutes
                    });

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            presignedUrl, s3Key
                        }),
                    };

                }else if(event.path === '/media/download-url'){

                    const { s3Key } = parsedBody;
                    if (!s3Key) {
                        return { statusCode: 400, body: JSON.stringify({ message: 's3Key is required.' }) };
                    }

                    console.log("[s3Key]", s3Key)

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
                return { statusCode: 404, body: JSON.stringify({ message: 'Method Not Found' }) };

            default:
                return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
        }

        // return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };
        
    } catch (error: any) {
        console.error('Image Handler Lambda Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
}