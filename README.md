# ECR Image Resolver

[![Test](https://github.com/ouchi2501/ecr-image-resolver/actions/workflows/test-action.yml/badge.svg)](https://github.com/ouchi2501/ecr-image-resolver/actions/workflows/test-action.yml)

A GitHub Action to retrieve the latest image tag from an AWS ECR (Elastic Container Registry) repository.

## Description

This action queries an AWS ECR repository and returns information about the latest pushed image, including its tag, full URI, and digest.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `repository-name` | ECR repository name | Yes | - |
| `aws-region` | AWS region | Yes | `us-east-1` |
| `registry-id` | AWS account ID for ECR registry | No | - |

## Outputs

| Output | Description |
|--------|-------------|
| `latest-tag` | Latest image tag in the ECR repository |
| `latest-image-uri` | Full URI of the latest image |
| `image-digest` | Digest of the latest image |

## Prerequisites

Before using this action, you need to configure AWS credentials. This can be done using the `aws-actions/configure-aws-credentials` action.

## Usage

```yaml
name: Get Latest ECR Image
on:
  workflow_dispatch:
  push:
    branches: [ main ]

jobs:
  get-latest-image:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Get latest ECR image
        id: ecr-image
        uses: ouchi2501/ecr-image-resolver@v1.0.0
        with:
          repository-name: 'my-app'
          aws-region: 'us-east-1'

      - name: Use the latest image
        run: |
          echo "Latest tag: ${{ steps.ecr-image.outputs.latest-tag }}"
          echo "Latest image URI: ${{ steps.ecr-image.outputs.latest-image-uri }}"
          echo "Image digest: ${{ steps.ecr-image.outputs.image-digest }}"
```

## Example with Docker Build and Push

```yaml
name: Build and Deploy
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Get latest ECR image
        id: ecr-image
        uses: your-username/ecr-image-resolver@v1
        with:
          repository-name: 'my-app'
          aws-region: 'us-east-1'

      - name: Deploy using latest image
        run: |
          # Use the latest image for deployment
          docker pull ${{ steps.ecr-image.outputs.latest-image-uri }}
          # Your deployment commands here
```

## Available Versions

- `@v1.0.0` - Stable release (recommended)
- `@main` - Latest development version

## IAM Permissions Required

The AWS credentials used must have the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:DescribeImages"
      ],
      "Resource": "arn:aws:ecr:*:*:repository/*"
    }
  ]
}
```

## Development

To build the action locally:

```bash
npm install
npm run build
```

To run tests:

```bash
npm test
npm run typecheck
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure they pass
5. Submit a pull request

## Repository

https://github.com/ouchi2501/ecr-image-resolver

## License

MIT