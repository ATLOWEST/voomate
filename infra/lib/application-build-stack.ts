import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { ApplicationFoundationStack } from './application-foundation-stack.js';
import type { StageConfig } from './config.js';

interface ApplicationBuildStackProps extends StackProps {
  readonly config: StageConfig;
  readonly foundation: ApplicationFoundationStack;
}

/** AWS-native image builds. A release archive is uploaded to the private source bucket and
 * CodeBuild builds/pushes immutable Docker images without depending on a developer laptop. */
export class ApplicationBuildStack extends Stack {
  constructor(scope: Construct, id: string, props: ApplicationBuildStackProps) {
    super(scope, id, props);

    for (const service of ['api', 'dashboard', 'voice'] as const) {
      const dockerfile =
        service === 'voice' ? 'services/voice/Dockerfile' : `Dockerfile.${service}`;
      const repository = props.foundation.repositories[service];
      const project = new codebuild.Project(
        this,
        `${service[0]!.toUpperCase()}${service.slice(1)}ImageBuild`,
        {
          projectName: `voomate-${props.config.stage}-${service}-image-build`,
          description: `Build and scan the Voomate ${service} image in AWS`,
          source: codebuild.Source.s3({
            bucket: props.foundation.releaseBucket,
            path: 'releases/current.zip',
          }),
          environment: {
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            computeType: codebuild.ComputeType.SMALL,
            privileged: true,
          },
          environmentVariables: {
            IMAGE_URI: { value: repository.repositoryUri },
            DOCKERFILE: { value: dockerfile },
            IMAGE_TAG: { value: 'candidate' },
          },
          buildSpec: codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
              pre_build: {
                commands: [
                  'aws ecr get-login-password --region "$AWS_DEFAULT_REGION" | docker login --username AWS --password-stdin "${IMAGE_URI%/*}"',
                ],
              },
              build: {
                commands: [
                  'docker build --pull --file "$DOCKERFILE" --tag "$IMAGE_URI:$IMAGE_TAG" .',
                ],
              },
              post_build: { commands: ['docker push "$IMAGE_URI:$IMAGE_TAG"'] },
            },
          }),
        },
      );

      props.foundation.releaseBucket.grantRead(project);
      repository.grantPullPush(project);
      project.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['ecr:GetAuthorizationToken'],
          resources: ['*'],
        }),
      );
      new CfnOutput(this, `${service[0]!.toUpperCase()}${service.slice(1)}BuildProjectName`, {
        value: project.projectName,
      });
    }
  }
}
