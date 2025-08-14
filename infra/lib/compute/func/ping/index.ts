
exports.handler = async() => {

    console.log("===============[PING]==================")
    
    console.log("Environment...", JSON.stringify(process.env, null, 2))

    const date = new Date();
    
    try {

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": true,
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `PONG from ${process.env.APP_NAME} at ${date.toISOString()}`
            })
        }

    } catch (error) {

        throw error

    }

}