import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  IStorageProvider,
  GetPresignedUrlParams,
  GetPresignedDownloadUrlParams,
} from "../../../application/contracts";
import { config } from "src/config";

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({ region: config.aws.region });
  }

  async getPresignedUploadUrl(params: GetPresignedUrlParams): Promise<string> {
    const { key, expiresIn = 300, contentType } = params;

    const command = new PutObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  async getPresignedDownloadUrl(params: GetPresignedDownloadUrlParams): Promise<string> {
    const { key, expiresIn = 3600 } = params;

    const command = new GetObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);
    const bytes = await response.Body?.transformToByteArray();

    if (!bytes) {
      throw new Error("Failed to get object from S3");
    }

    return Buffer.from(bytes);
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }
}
