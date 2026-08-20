import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';
import type { StageConfig } from './config.js';

interface LandingDeliveryStackProps extends StackProps {
  readonly config: StageConfig;
}

/**
 * AWS-owned delivery for the public marketing site. The S3 bucket is never public: only
 * CloudFront's Origin Access Control can read it. Cloudflare will proxy the final domain,
 * providing DNS, TLS and WAF without hosting the application itself.
 */
export class LandingDeliveryStack extends Stack {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: LandingDeliveryStackProps) {
    super(scope, id, props);

    // Cloudflare is the public DNS/TLS/WAF edge, but it must still be able to make a
    // TLS-verified request to the AWS origin using the customer's hostname. Keeping the
    // alternate names on CloudFront avoids a fragile "origin host header" workaround.
    // This is intentionally a single temporary launch domain; a future brand-domain
    // migration must add its own ACM certificate before changing DNS.
    const landingCertificate = acm.Certificate.fromCertificateArn(
      this,
      'LandingCertificate',
      'arn:aws:acm:us-east-1:424999960818:certificate/f4d52737-4e8c-444e-b5a9-9ed1ccb2f085',
    );

    const siteBucket = new s3.Bucket(this, 'LandingAssets', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      autoDeleteObjects: false,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const responseHeaders = new cloudfront.ResponseHeadersPolicy(this, 'LandingSecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=()',
            override: true,
          },
        ],
      },
    });

    // Next's static export writes marketing pages as `pricing.html`, while public URLs must
    // remain clean (`/pricing`). This function runs at the edge before S3 is consulted.
    const cleanUrlRewrite = new cloudfront.Function(this, 'CleanUrlRewrite', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri === '/') {
    request.uri = '/index.html';
  } else if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.indexOf('.') === -1) {
    request.uri = uri + '.html';
  }
  return request;
}`),
    });

    this.distribution = new cloudfront.Distribution(this, 'LandingDistribution', {
      defaultRootObject: 'index.html',
      certificate: landingCertificate,
      domainNames: ['atlowest.in', 'www.atlowest.in'],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: responseHeaders,
        compress: true,
        functionAssociations: [
          { eventType: cloudfront.FunctionEventType.VIEWER_REQUEST, function: cleanUrlRewrite },
        ],
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
      ],
    });

    new s3deploy.BucketDeployment(this, 'PublishLanding', {
      sources: [s3deploy.Source.asset('../apps/landing/out')],
      destinationBucket: siteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
      retainOnDelete: true,
    });

    new CfnOutput(this, 'LandingDistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'AWS CloudFront origin for Cloudflare DNS; do not expose S3 directly',
    });
    new CfnOutput(this, 'LandingAssetsBucketName', { value: siteBucket.bucketName });
  }
}
