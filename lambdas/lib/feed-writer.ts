import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { SQSEvent, SQSBatchItemFailure, SQSBatchResponse, Context } from 'aws-lambda';

const baseClient = new DynamoDBClient({});
const client = DynamoDBDocument.from(baseClient);

const feedTable = process.env['FeedTable'];
const defaultFeedId = 'default'
const feedMessageTtl = 1000 * 60 * 60 * 24; // 24h
const millisecondsToSeconds = 1/ 1000;

interface Message {
    MessageId: number,
    Author: string,
    Text: string,
    CreatedAt: number
}

export async function handler(event: SQSEvent, context: Context): Promise<SQSBatchResponse> {
    const failures: SQSBatchItemFailure[] = [];

    for (const record of event.Records) {
        try {
            let message = JSON.parse(record.body) as Message;
            let ttl = (message.CreatedAt + feedMessageTtl) * millisecondsToSeconds;
            let item = {
                FeedId: defaultFeedId,
                TimeToLive: ttl,
                ...message
            }
            
            await client.put({
                TableName: feedTable,
                Item: item
            });

            console.log(`item = ${JSON.stringify(item)}`);
        } catch (error) {
            console.error(error);
            failures.push({ itemIdentifier: record.messageId });
        }
    }

    return {
        batchItemFailures: failures
    }
}
