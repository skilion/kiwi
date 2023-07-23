import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const ddbDocument = DynamoDBDocument.from(dynamoClient);

const feedTable = process.env['FeedTable'];
const defaultFeedId = 'default'
const paginationItemCount = 10;

export async function handler(event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> {

    let lastMessageTime = Number.MAX_SAFE_INTEGER;
    if (event.queryStringParameters !== null) {
        const value = parseInt(event.queryStringParameters['LastMessageTime']!);
        if (!isNaN(value)) {
            lastMessageTime = value;
        }
    }

    const feed = await getFeed(lastMessageTime);
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(feed)
    }
}

async function getFeed(lastMessageTime: number) {
    console.log(lastMessageTime);
    const response = await ddbDocument.query({
        TableName: feedTable,
        KeyConditionExpression: 'FeedId = :feedId and CreatedAt < :lastTime',
        ExpressionAttributeValues: {
            ':feedId': defaultFeedId,
            ':lastTime': lastMessageTime
        },
        ProjectionExpression: 'MessageId, Author, #Text, CreatedAt',
        ExpressionAttributeNames: {
            '#Text': 'Text'
        },
        ScanIndexForward: false,
        Limit: paginationItemCount
    });
    return response.Items;
}
