import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { SQSEvent, SQSBatchItemFailure, SQSBatchResponse, Context } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const ddbDocument = DynamoDBDocument.from(dynamoClient);
const sqsClient = new SQSClient({});

const messagesTable = process.env['MessagesTable'];
const feedWriterQueue = process.env['FeedWriterQueue'];

const startingMessageId = 4_000_000;
const maxWriteAttempts = 100;

interface NewMessage {
    Author: string,
    Text: string
}

interface Message extends NewMessage {
    MessageId: number,
    CreatedAt: number
}

export async function handler(event: SQSEvent, context: Context): Promise<SQSBatchResponse> {
    const failures: SQSBatchItemFailure[] = [];

    for (const record of event.Records) {
        try {
            const newMessage = JSON.parse(record.body) as NewMessage;
            validateNewMessage(newMessage);

            const message = await putMessageInDynamoDb(newMessage);
            await sendMessageToQueue(message);

            console.log(`message = ${JSON.stringify(message)}`);
        } catch (error) {
            console.error(error);
            failures.push({ itemIdentifier: record.messageId });
        }
    }

    return {
        batchItemFailures: failures
    }
}

function validateNewMessage(newMessage: NewMessage) {
    if (typeof newMessage.Author !== 'string') {
        throw new Error('Author is missing')
    }
    if (typeof newMessage.Text !== 'string') {
        throw new Error('Text is missing')
    }
    if (newMessage.Text.length > 128) {
        throw new Error('Text must be shorter than 128 characters')
    }
}

async function putMessageInDynamoDb(newMessage: NewMessage): Promise<Message> {
    let item = {
        MessageId: generatePartitionKey(),
        Author: newMessage.Author,
        Text: newMessage.Text,
        CreatedAt: new Date().getTime()
    }

    let count = 0;
    while (true) {
        try {
            await ddbDocument.put({
                TableName: messagesTable,
                ConditionExpression: 'attribute_not_exists(MessageId)',
                Item: item
            });
        }
        catch (error) {
            if (error instanceof ConditionalCheckFailedException) {
                item.MessageId++;
                if (count++ >= maxWriteAttempts) {
                    throw new Error('Maximum attempts to write reached');
                }
                continue;
            }
            throw error;
        }
        break;
    }

    return item;
}

async function sendMessageToQueue(message: Message) {
    const command = new SendMessageCommand({
        QueueUrl: feedWriterQueue,
        MessageBody: JSON.stringify(message)
    })
    await sqsClient.send(command);
}

function generatePartitionKey(): number {
    return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - startingMessageId)) + startingMessageId;
}