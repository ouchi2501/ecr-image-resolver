import * as core from '@actions/core';
import { ECRClient, DescribeImagesCommand } from '@aws-sdk/client-ecr';
import { mockClient } from 'aws-sdk-client-mock';
import { run } from '../src/index';

// Mock the entire module
jest.mock('@actions/core');

describe('ECR Image Resolver Action', () => {
  const ecrMock = mockClient(ECRClient);
  const mockedCore = core as jest.Mocked<typeof core>;

  beforeEach(() => {
    jest.clearAllMocks();
    ecrMock.reset();
  });

  describe('run', () => {
    it('should successfully get the latest image', async () => {
      const mockImages = {
        imageDetails: [
          {
            registryId: '123456789012',
            repositoryName: 'test-repo',
            imageDigest: 'sha256:older',
            imageTags: ['v1.0.0'],
            imagePushedAt: new Date('2024-01-01')
          },
          {
            registryId: '123456789012',
            repositoryName: 'test-repo',
            imageDigest: 'sha256:latest',
            imageTags: ['v2.0.0', 'latest'],
            imagePushedAt: new Date('2024-01-02')
          }
        ]
      };

      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'repository-name') return 'test-repo';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'registry-id') return '';
        return '';
      });

      ecrMock.on(DescribeImagesCommand).resolves(mockImages);

      await run();

      expect(mockedCore.info).toHaveBeenCalledWith('Fetching images from ECR repository: test-repo');
      expect(mockedCore.info).toHaveBeenCalledWith('Latest image found: 123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:v2.0.0');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('latest-tag', 'v2.0.0');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('latest-image-uri', '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:v2.0.0');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('image-digest', 'sha256:latest');
    });

    it('should fail when no images are found', async () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'repository-name') return 'test-repo';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'registry-id') return '';
        return '';
      });

      ecrMock.on(DescribeImagesCommand).resolves({
        imageDetails: []
      });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith('Action failed with error: No images found in repository: test-repo');
    });

    it('should fail when no tagged images are found', async () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'repository-name') return 'test-repo';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'registry-id') return '';
        return '';
      });

      ecrMock.on(DescribeImagesCommand).resolves({
        imageDetails: [
          {
            registryId: '123456789012',
            repositoryName: 'test-repo',
            imageDigest: 'sha256:untagged',
            imageTags: [],
            imagePushedAt: new Date('2024-01-01')
          }
        ]
      });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith('Action failed with error: No tagged images found in repository: test-repo');
    });

    it('should use custom registry ID when provided', async () => {
      const mockImages = {
        imageDetails: [
          {
            repositoryName: 'test-repo',
            imageDigest: 'sha256:latest',
            imageTags: ['v1.0.0'],
            imagePushedAt: new Date('2024-01-01')
          }
        ]
      };

      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'repository-name') return 'test-repo';
        if (name === 'aws-region') return 'eu-west-1';
        if (name === 'registry-id') return '987654321098';
        return '';
      });

      ecrMock.on(DescribeImagesCommand).resolves(mockImages);

      await run();

      expect(mockedCore.setOutput).toHaveBeenCalledWith('latest-image-uri', '987654321098.dkr.ecr.eu-west-1.amazonaws.com/test-repo:v1.0.0');
    });

    it('should handle ECR API errors gracefully', async () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'repository-name') return 'test-repo';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'registry-id') return '';
        return '';
      });

      ecrMock.on(DescribeImagesCommand).rejects(new Error('ECR API Error'));

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith('Action failed with error: ECR API Error');
    });

    it('should sort images by pushed date correctly', async () => {
      const mockImages = {
        imageDetails: [
          {
            registryId: '123456789012',
            repositoryName: 'test-repo',
            imageDigest: 'sha256:middle',
            imageTags: ['v1.5.0'],
            imagePushedAt: new Date('2024-01-15')
          },
          {
            registryId: '123456789012',
            repositoryName: 'test-repo',
            imageDigest: 'sha256:newest',
            imageTags: ['v2.0.0'],
            imagePushedAt: new Date('2024-01-20')
          },
          {
            registryId: '123456789012',
            repositoryName: 'test-repo',
            imageDigest: 'sha256:oldest',
            imageTags: ['v1.0.0'],
            imagePushedAt: new Date('2024-01-01')
          }
        ]
      };

      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'repository-name') return 'test-repo';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'registry-id') return '';
        return '';
      });

      ecrMock.on(DescribeImagesCommand).resolves(mockImages);

      await run();

      expect(mockedCore.setOutput).toHaveBeenCalledWith('latest-tag', 'v2.0.0');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('image-digest', 'sha256:newest');
    });

    it('should handle multiple tags on the latest image', async () => {
      const mockImages = {
        imageDetails: [
          {
            registryId: '123456789012',
            repositoryName: 'test-repo',
            imageDigest: 'sha256:latest',
            imageTags: ['latest', 'v2.0.0', 'production'],
            imagePushedAt: new Date('2024-01-02')
          }
        ]
      };

      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'repository-name') return 'test-repo';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'registry-id') return '';
        return '';
      });

      ecrMock.on(DescribeImagesCommand).resolves(mockImages);

      await run();

      // Should use the first tag in the array
      expect(mockedCore.setOutput).toHaveBeenCalledWith('latest-tag', 'latest');
    });
  });
});