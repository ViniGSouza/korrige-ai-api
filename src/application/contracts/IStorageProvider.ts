export interface GetPresignedUrlParams {
  key: string;
  expiresIn?: number;
  contentType?: string;
}

export interface GetPresignedDownloadUrlParams {
  key: string;
  expiresIn?: number;
}

export interface IStorageProvider {
  getPresignedUploadUrl(params: GetPresignedUrlParams): Promise<string>;
  getPresignedDownloadUrl(params: GetPresignedDownloadUrlParams): Promise<string>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
}
