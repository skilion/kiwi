import * as fs from 'node:fs';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { EventBridgeEvent, Context } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const ddbDocument = DynamoDBDocument.from(dynamoClient);
const sqsClient = new SQSClient({});

const nameFile = 'names1000.txt';

const messagesTable = process.env['MessagesTable'];
const postMessageQueue = process.env['PostMessageQueue'];

interface NewMessage {
    Author: string,
    Text: string
}

export async function handler(event: EventBridgeEvent<string, any>, context: Context) {
    let state = await loadState();
    if (state.nextMessageId === undefined) {
        state.nextMessageId = 0;
    }

    const response = await ddbDocument.get({
        TableName: messagesTable,
        Key: {
            MessageId: state.nextMessageId
        }
    });

    state.nextMessageId++;
    saveState(state);

    let newMessage: NewMessage = {
        Author: getRandomName(),
        Text: response.Item?.Text
    }
    sendNewMessageToPostMessageQueue(newMessage);

    console.log(`newMessage = ${JSON.stringify(newMessage)}`);
}

function getRandomName(): string {
    const data = fs.readFileSync(nameFile, 'utf8');
    const names = data.split('\n');
    let index = Math.floor(Math.random() * names.length);
    return names[index];
}

async function loadState(): Promise<any> {
    const response = await ddbDocument.get({
        TableName: messagesTable,
        Key: {
            MessageId: -1
        }
    });
    if (response.Item === undefined || response.Item.State == undefined) {
        return { }
    }
    return response.Item.State;
}

async function saveState(state: any): Promise<void> {
    await ddbDocument.put({
        TableName: messagesTable,
        Item: {
            MessageId: -1,
            State: state
        }
    });
}

async function sendNewMessageToPostMessageQueue(newMessage: NewMessage) {
    const command = new SendMessageCommand({
        QueueUrl: postMessageQueue,
        MessageBody: JSON.stringify(newMessage)
    })
    await sqsClient.send(command);
}
