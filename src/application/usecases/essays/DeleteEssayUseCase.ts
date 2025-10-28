import { IEssayRepository, IStorageProvider } from '../../contracts';
import { NotFoundError } from '../../errors';

export interface DeleteEssayUseCaseInput {
  essayId: string;
  userId: string;
}

export class DeleteEssayUseCase {
  constructor(
    private readonly essayRepository: IEssayRepository,
    private readonly storageProvider: IStorageProvider
  ) {}

  async execute(input: DeleteEssayUseCaseInput): Promise<void> {
    const { essayId, userId } = input;

    // Verificar se redação existe
    const essay = await this.essayRepository.findById(essayId, userId);
    if (!essay) {
      throw new NotFoundError('Redação não encontrada');
    }

    // Deletar arquivo do S3 se existir
    if (essay.fileKey) {
      await this.storageProvider.deleteObject(essay.fileKey);
    }

    // Deletar redação do banco de dados
    await this.essayRepository.delete(essayId, userId);
  }
}
