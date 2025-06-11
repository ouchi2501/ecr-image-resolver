"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const core = __importStar(require("@actions/core"));
const client_ecr_1 = require("@aws-sdk/client-ecr");
async function getInputs() {
    return {
        repositoryName: core.getInput('repository-name', { required: true }),
        awsRegion: core.getInput('aws-region', { required: true }),
        registryId: core.getInput('registry-id') || undefined
    };
}
async function run() {
    try {
        const { repositoryName, awsRegion, registryId } = await getInputs();
        const ecrClient = new client_ecr_1.ECRClient({ region: awsRegion });
        const params = {
            repositoryName: repositoryName,
            filter: {
                tagStatus: 'TAGGED'
            }
        };
        if (registryId) {
            params.registryId = registryId;
        }
        core.info(`Fetching images from ECR repository: ${repositoryName}`);
        const command = new client_ecr_1.DescribeImagesCommand(params);
        const response = await ecrClient.send(command);
        if (!response.imageDetails || response.imageDetails.length === 0) {
            throw new Error(`No images found in repository: ${repositoryName}`);
        }
        const sortedImages = response.imageDetails
            .filter((image) => {
            return !!(image.imageTags && image.imageTags.length > 0);
        })
            .sort((a, b) => {
            const dateA = new Date(a.imagePushedAt);
            const dateB = new Date(b.imagePushedAt);
            return dateB.getTime() - dateA.getTime();
        });
        if (sortedImages.length === 0) {
            throw new Error(`No tagged images found in repository: ${repositoryName}`);
        }
        const latestImage = sortedImages[0];
        const latestTag = latestImage.imageTags[0];
        const registryIdToUse = latestImage.registryId || registryId;
        const imageUri = `${registryIdToUse}.dkr.ecr.${awsRegion}.amazonaws.com/${repositoryName}:${latestTag}`;
        core.info(`Latest image found: ${imageUri}`);
        core.info(`Image pushed at: ${latestImage.imagePushedAt}`);
        core.info(`Image digest: ${latestImage.imageDigest}`);
        core.setOutput('latest-tag', latestTag);
        core.setOutput('latest-image-uri', imageUri);
        core.setOutput('image-digest', latestImage.imageDigest || '');
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Action failed with error: ${error.message}`);
        }
        else {
            core.setFailed('Action failed with unknown error');
        }
    }
}
// Only run if this is the main module
if (require.main === module) {
    run();
}
//# sourceMappingURL=index.js.map