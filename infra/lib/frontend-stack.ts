import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';

export interface DeonyFrontendStackProps extends cdk.StackProps {
  frontendBucket: s3.IBucket;
  mediaBucket: s3.IBucket;
  httpApi: apigw2.IHttpApi;
}

export class DeonyFrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: DeonyFrontendStackProps) {
    super(scope, id, props);

    // Extract API Gateway domain (strip https://)
    const apiDomain = cdk.Fn.select(1, cdk.Fn.split('://', props.httpApi.apiEndpoint));

    // 1. CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'DeonyDistribution', {
      defaultRootObject: 'index.html',
      comment: 'Deony Personal Archive CDN Distribution',
      // Default behavior: Frontend Web App (S3)
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(props.frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      // API Behavior: /api/* -> API Gateway HTTP API
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
        // Media Covers Behavior: /media/* -> Media S3 Bucket
        '/media/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(props.mediaBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      // SPA Client-Side Routing Invariant: Map 403 & 404 to index.html
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Deony Production URL',
      exportName: 'DeonyProductionUrl',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: 'DeonyDistributionId',
    });
  }
}
