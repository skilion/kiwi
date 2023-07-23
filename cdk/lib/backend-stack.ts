import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';


export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const messagesTable = dynamodb.Table.fromTableName(this, 'Messages', 'InfrastructureStack-Messages804FA4EB-NQP45VDYFAO3');

    const feedTable = new dynamodb.Table(this, 'Feed', {
      partitionKey: { name: 'FeedId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'CreatedAt', type: dynamodb.AttributeType.NUMBER },
      readCapacity: 5,
      writeCapacity: 5,
      timeToLiveAttribute: 'TimeToLive',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });


    const postMessageDeadLetterQueue = new sqs.Queue(this, 'postMessageDeadLetterQueue', {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    const postMessageQueue = new sqs.Queue(this, 'PostMessageQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        queue: postMessageDeadLetterQueue,
        maxReceiveCount: 1
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    const feedWriterQueue = new sqs.Queue(this, 'FeedWriterQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });


    const userSimulatorLambda = new lambda.NodejsFunction(this, 'UserSimulator', {
      bundling: {
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [`cp -r ${inputDir}/lambdas/lib/names1000.txt ${outputDir}`]
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return []
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return []
          },
        }
      },
      entry: path.join(__dirname, '/../../lambdas/lib/user-simulator.ts'),
      environment: {
        MessagesTable: messagesTable.tableName,
        PostMessageQueue: postMessageQueue.queueName
      },
      logRetention: cdk.aws_logs.RetentionDays.TWO_WEEKS
    });
    messagesTable.grantReadWriteData(userSimulatorLambda);
    postMessageQueue.grantSendMessages(userSimulatorLambda);

    const getFeedLambda = new lambda.NodejsFunction(this, 'GetFeed', {
      entry: path.join(__dirname, '/../../lambdas/lib/get-feed.ts'),
      environment: {
        FeedTable: feedTable.tableName
      },
      logRetention: cdk.aws_logs.RetentionDays.TWO_WEEKS
    });
    feedTable.grantReadData(getFeedLambda);

    const postMessageLambda = new lambda.NodejsFunction(this, 'PostMessage', {
      entry: path.join(__dirname, '/../../lambdas/lib/post-message.ts'),
      environment: {
        MessagesTable: messagesTable.tableName,
        FeedWriterQueue: feedWriterQueue.queueName
      },
      events: [
        new SqsEventSource(postMessageQueue, { batchSize: 10, reportBatchItemFailures: true })
      ],
      logRetention: cdk.aws_logs.RetentionDays.TWO_WEEKS
    });
    messagesTable.grantReadWriteData(postMessageLambda);
    feedWriterQueue.grantSendMessages(postMessageLambda);

    const feedWriterLambda = new lambda.NodejsFunction(this, 'FeedWriter', {
      entry: path.join(__dirname, '/../../lambdas/lib/feed-writer.ts'),
      environment: {
        FeedTable: feedTable.tableName
      },
      events: [
        new SqsEventSource(feedWriterQueue, { batchSize: 10, reportBatchItemFailures: true })
      ],
      logRetention: cdk.aws_logs.RetentionDays.TWO_WEEKS
    });
    feedTable.grantReadWriteData(feedWriterLambda);


    const userSimulatorSchedule = new events.Rule(this, 'userSimulatorSchedule', {
      schedule: events.Schedule.expression('cron(* * ? * * *)')
    });
    userSimulatorSchedule.addTarget(new targets.LambdaFunction(userSimulatorLambda));


    const api = new apigateway.RestApi(this, 'MessageApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["*"],
        allowCredentials: true
      }
    });
    api.addUsagePlan('MessageApiUsagePlan', {
      name: 'Default',
      throttle: {
        rateLimit: 10,
        burstLimit: 2
      }
    })


    const postMessageApiRole = new iam.Role(this, 'postMessageApiRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    postMessageQueue.grantSendMessages(postMessageApiRole);

    const messageApi = api.root.addResource('messages');
    messageApi.addMethod('POST', new apigateway.AwsIntegration({
      service: 'sqs',
      path: `${cdk.Aws.ACCOUNT_ID}/${postMessageQueue.queueName}`,
      options: {
        credentialsRole: postMessageApiRole,
        requestParameters: {
          'integration.request.header.Content-Type': '\'application/x-www-form-urlencoded\'',
        },
        requestTemplates: {
          'application/json': 'Action=SendMessage&MessageBody=$input.body',
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': '\'*\'',
              'method.response.header.Access-Control-Allow-Credentials': '\'true\''
            },
          },
          {
            statusCode: '400',
          },
          {
            statusCode: '500',
          }
        ]
      }
    }), {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Credentials': true
          }
        },
        {
          statusCode: '400',
        },
        {
          statusCode: '500',
        }
      ]
    });

    const feedApi = api.root.addResource('feed');
    feedApi.addMethod('GET', new apigateway.LambdaIntegration(getFeedLambda));

    new cdk.CfnOutput(this, 'BackendApiUrl', {
      value: api.url,
      exportName: 'BackendApiUrl',
    });
  }
}
