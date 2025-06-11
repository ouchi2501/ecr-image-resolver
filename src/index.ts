import * as core from '@actions/core';
import { ECRClient, DescribeImagesCommand, ImageDetail } from '@aws-sdk/client-ecr';

interface ActionInputs {
  repositoryName: string;
  awsRegion: string;
  registryId?: string;
}

async function getInputs(): Promise<ActionInputs> {
  return {
    repositoryName: core.getInput('repository-name', { required: true }),
    awsRegion: core.getInput('aws-region', { required: true }),
    registryId: core.getInput('registry-id') || undefined
  };
}

export async function run(): Promise<void> {
  try {
    const { repositoryName, awsRegion, registryId } = await getInputs();

    const ecrClient = new ECRClient({ region: awsRegion });

    const params: {
      repositoryName: string;
      filter: { tagStatus: 'TAGGED' | 'UNTAGGED' | 'ANY' };
      registryId?: string;
    } = {
      repositoryName: repositoryName,
      filter: {
        tagStatus: 'TAGGED'
      }
    };

    if (registryId) {
      params.registryId = registryId;
    }

    core.info(`Fetching images from ECR repository: ${repositoryName}`);
    
    const command = new DescribeImagesCommand(params);
    const response = await ecrClient.send(command);

    if (!response.imageDetails || response.imageDetails.length === 0) {
      throw new Error(`No images found in repository: ${repositoryName}`);
    }

    const sortedImages = response.imageDetails
      .filter((image: ImageDetail): boolean => {
        return !!(image.imageTags && image.imageTags.length > 0);
      })
      .sort((a: ImageDetail, b: ImageDetail): number => {
        const dateA = new Date(a.imagePushedAt!);
        const dateB = new Date(b.imagePushedAt!);
        return dateB.getTime() - dateA.getTime();
      });

    if (sortedImages.length === 0) {
      throw new Error(`No tagged images found in repository: ${repositoryName}`);
    }

    const latestImage = sortedImages[0];
    const latestTag = latestImage.imageTags![0];
    const registryIdToUse = latestImage.registryId || registryId;
    const imageUri = `${registryIdToUse}.dkr.ecr.${awsRegion}.amazonaws.com/${repositoryName}:${latestTag}`;

    core.info(`Latest image found: ${imageUri}`);
    core.info(`Image pushed at: ${latestImage.imagePushedAt}`);
    core.info(`Image digest: ${latestImage.imageDigest}`);

    core.setOutput('latest-tag', latestTag);
    core.setOutput('latest-image-uri', imageUri);
    core.setOutput('image-digest', latestImage.imageDigest || '');

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed('Action failed with unknown error');
    }
  }
}

// Only run if this is the main module
if (require.main === module) {
  run();
}