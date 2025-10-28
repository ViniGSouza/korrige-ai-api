import ksuid from 'ksuid';
import { IStorageProvider } from '../../contracts';

export interface GetUploadUrlUseCaseInput {
  userId: string;
  fileExtension: string;
  contentType: string;
}

export interface GetUploadUrlUseCaseOutput {
  uploadUrl: string;
  fileKey: string;
}

export class GetUploadUrlUseCase {
  constructor(private readonly storageProvider: IStorageProvider) {}

  async execute(input: GetUploadUrlUseCaseInput): Promise<GetUploadUrlUseCaseOutput> {
    const { userId, fileExtension, contentType } = input;

    // Gerar chave única para o arquivo
    const fileId = ksuid.randomSync().string;
    const fileKey = `essays/${userId}/${fileId}.${fileExtension}`;

    // Obter URL pré-assinada para upload
    const uploadUrl = await this.storageProvider.getPresignedUploadUrl({
      key: fileKey,
      expiresIn: 300, // 5 minutos
      contentType,
    });

    return {
      uploadUrl,
      fileKey,
    };
  }
}
