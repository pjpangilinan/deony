import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class DeonyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================
    // 1. DYNAMODB TABLES
    // ==========================================

    // User Table
    const userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: 'deony-users',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    userTable.addGlobalSecondaryIndex({
      indexName: 'UsernameIndex',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Category Table
    const categoryTable = new dynamodb.Table(this, 'CategoryTable', {
      tableName: 'deony-categories',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    categoryTable.addGlobalSecondaryIndex({
      indexName: 'UserCategoriesIndex',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sort_order', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Media Table (No lookup GSI - uniqueness enforced via PK)
    const mediaTable = new dynamodb.Table(this, 'MediaTable', {
      tableName: 'deony-media',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Experience Table
    const experienceTable = new dynamodb.Table(this, 'ExperienceTable', {
      tableName: 'deony-experiences',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI1: CategoryStatusIndex
    experienceTable.addGlobalSecondaryIndex({
      indexName: 'CategoryStatusIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: TimelineIndex (Sparse - items without GSI2SK are excluded)
    experienceTable.addGlobalSecondaryIndex({
      indexName: 'TimelineIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: AlphaIndex
    experienceTable.addGlobalSecondaryIndex({
      indexName: 'AlphaIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: RecentlyAddedIndex
    experienceTable.addGlobalSecondaryIndex({
      indexName: 'RecentlyAddedIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI4SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ==========================================
    // 2. COGNITO AUTHENTICATION
    // ==========================================

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'deony-user-pool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'deony-web-client',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ==========================================
    // 3. S3 STORAGE
    // ==========================================

    // Frontend Web Assets Bucket
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // User Media Uploads Bucket
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3600,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ==========================================
    // 4. LAMBDA API & API GATEWAY HTTP API
    // ==========================================

    const apiHandler = new nodejs.NodejsFunction(this, 'ApiHandler', {
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
        USER_TABLE: userTable.tableName,
        CATEGORY_TABLE: categoryTable.tableName,
        MEDIA_TABLE: mediaTable.tableName,
        EXPERIENCE_TABLE: experienceTable.tableName,
        S3_BUCKET_NAME: mediaBucket.bucketName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        TMDB_SSM_PARAM: '/deony/production/tmdb-api-key',
        RAWG_SSM_PARAM: '/deony/production/rawg-api-key',
      },
    });

    // Grant Table & S3 Permissions
    userTable.grantReadWriteData(apiHandler);
    categoryTable.grantReadWriteData(apiHandler);
    mediaTable.grantReadWriteData(apiHandler);
    experienceTable.grantReadWriteData(apiHandler);
    mediaBucket.grantReadWrite(apiHandler);

    // Grant SSM Parameter Store Access
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/deony/production/*`,
        ],
      })
    );

    // Grant Amazon Bedrock Permissions for Deonysus AI Agent & Guardrails
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:ApplyGuardrail',
        ],
        resources: ['*'],
      })
    );

    // API Gateway HTTP API (v2)
    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      'ApiLambdaIntegration',
      apiHandler
    );

    const httpApi = new apigw2.HttpApi(this, 'DeonyHttpApi', {
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

    httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigw2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    httpApi.addRoutes({
      path: '/api',
      methods: [apigw2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // ==========================================
    // 5. CLOUDFRONT DISTRIBUTION
    // ==========================================

    const apiDomain = cdk.Fn.select(1, cdk.Fn.split('://', httpApi.apiEndpoint));

    // SPA URL Rewrite Function (Rewrites client routes like /library to /index.html without intercepting /api/*)
    const spaRewriteFunction = new cloudfront.Function(this, 'SpaRewriteFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } else if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    return request;
}
      `),
    });

    const distribution = new cloudfront.Distribution(this, 'DeonyDistribution', {
      defaultRootObject: 'index.html',
      comment: 'Deony Personal Archive CDN Distribution',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: spaRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiDomain),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/api': {
          origin: new origins.HttpOrigin(apiDomain),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/media/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(mediaBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // ==========================================
    // 6. CLOUDFORMATION OUTPUTS
    // ==========================================

    new cdk.CfnOutput(this, 'ProductionUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Live CloudFront Application URL',
      exportName: 'DeonyProductionUrl',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: 'DeonyDistributionId',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Frontend Bucket Name',
      exportName: 'DeonyFrontendBucketName',
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: mediaBucket.bucketName,
      description: 'S3 Media Bucket Name',
      exportName: 'DeonyMediaBucketName',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'DeonyUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'DeonyUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: httpApi.url || '',
      description: 'Backend HTTP API Gateway URL',
      exportName: 'DeonyHttpApiUrl',
    });
  }
}
