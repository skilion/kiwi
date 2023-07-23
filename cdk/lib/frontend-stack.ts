import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';


export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const frontendBucket = new s3.Bucket(this, 'Frontend', {
      bucketName: 'kiwi.aradaelli.com',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      publicReadAccess: true,      
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    const deployment = new s3Deployment.BucketDeployment(this, 'deployFrontend', {
      sources: [s3Deployment.Source.asset(path.join(__dirname, '/../../frontend/dist'))],
      destinationBucket: frontendBucket,
      logRetention: cdk.aws_logs.RetentionDays.TWO_WEEKS
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      exportName: 'FrontendUrl',
    });
  }
}