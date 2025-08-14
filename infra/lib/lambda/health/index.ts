import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const APP_NAME = process.env.APP_NAME!;

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        console.log('Received event:', JSON.stringify(event, null, 2));

        if (event.path === '/health/ping' && event.httpMethod === 'GET') {

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
                body: JSON.stringify({ message: `Pong from ${APP_NAME} Lambda Function.`, timestamp: istDateTime }),
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