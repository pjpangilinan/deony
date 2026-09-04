import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

export interface DeonyApiStackProps extends cdk.StackProps {
  userTable: dynamodb.ITable;
  categoryTable: dynamodb.ITable;
  mediaTable: dynamodb.ITable;
  experienceTable: dynamodb.ITable;
  mediaBucket: s3.IBucket;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class DeonyApiStack extends cdk.Stack {
  public readonly apiHandler: nodejs.NodejsFunction;
  public readonly httpApi: apigw2.HttpApi;

  constructor(scope: Construct, id: string, props: DeonyApiStackProps) {
    super(scope, id, props);

    // 1. Production API Lambda Function
    this.apiHandler = new nodejs.NodejsFunction(this, 'ApiHandler', {
      functionName: 'deony-api-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      entry: path.join(__dirname, '../../server/lambda.ts'),
      handler: 'handler',
      projectRoot: path.join(__dirname, '../../'),
      depsLockFilePath: path.join(__dirname, '../../package-lock.json'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        format: nodejs.OutputFormat.CJS,
      },
      environment: {
        NODE_ENV: 'production',
        USER_TABLE: props.userTable.tableName,
        CATEGORY_TABLE: props.categoryTable.tableName,
        MEDIA_TABLE: props.mediaTable.tableName,
        EXPERIENCE_TABLE: props.experienceTable.tableName,
        S3_BUCKET_NAME: props.mediaBucket.bucketName,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
        TMDB_SSM_PARAM: '/deony/production/tmdb-api-key',
        RAWG_SSM_PARAM: '/deony/production/rawg-api-key',
      },
    });

    // 2. Grant Database & S3 Permissions
    props.userTable.grantReadWriteData(this.apiHandler);
    props.categoryTable.grantReadWriteData(this.apiHandler);
    props.mediaTable.grantReadWriteData(this.apiHandler);
    props.experienceTable.grantReadWriteData(this.apiHandler);
    props.mediaBucket.grantReadWrite(this.apiHandler);

    // 3. Grant SSM Parameter Store Permissions for external provider keys
    this.apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/deony/production/*`,
        ],
      })
    );

    // 4. API Gateway HTTP API (v2)
    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      'ApiLambdaIntegration',
      this.apiHandler
    );

    this.httpApi = new apigw2.HttpApi(this, 'DeonyHttpApi', {
      apiName: 'deony-api',
      description: 'Deony Serverless Backend HTTP API',
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [
          apigw2.CorsHttpMethod.GET,
          apigw2.CorsHttpMethod.HEAD,
          apigw2.CorsHttpMethod.OPTIONS,
          apigw2.CorsHttpMethod.POST,
          apigw2.CorsHttpMethod.PUT,
          apigw2.CorsHttpMethod.PATCH,
          apigw2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
    });

    this.httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigw2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    this.httpApi.addRoutes({
      path: '/api',
      methods: [apigw2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.url || '',
      description: 'HTTP API Gateway URL',
      exportName: 'DeonyHttpApiUrl',
    });
  }
}
