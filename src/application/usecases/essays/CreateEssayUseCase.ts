import ksuid from 'ksuid';
import { IEssayRepository, IQueueProvider } from '../../contracts';
import { Essay, SQSEssayMessage } from '../../entities';
import { config } from '../../../config';

export interface CreateEssayUseCaseInput {
  userId: string;
  title: string;
  content?: string;
  fileKey?: string;
  fileType?: 'image' | 'pdf' | 'docx' | 'text';
  aiProvider?: 'claude' | 'openai';
}

export type CreateEssayUseCaseOutput = Essay;

export class CreateEssayUseCase {
  constructor(
    private readonly essayRepository: IEssayRepository,
    private readonly queueProvider: IQueueProvider
  ) {}

  async execute(input: CreateEssayUseCaseInput): Promise<CreateEssayUseCaseOutput> {
    const { userId, title, content, fileKey, fileType, aiProvider = 'claude' } = input;

    // Gerar ID único
    const essayId = ksuid.randomSync().string;

    // Criar redação no banco de dados
    const essay = await this.essayRepository.create({
      essayId,
      userId,
      title,
      content,
      fileKey,
      fileType,
      aiProvider,
    });

    // Enfileirar mensagem para processamento assíncrono
    const message: SQSEssayMessage = {
      essayId,
      userId,
      aiProvider,
    };

    await this.queueProvider.sendMessage({
      queueUrl: config.sqs.queueUrl,
      messageBody: JSON.stringify(message),
    });

    return essay;
  }
}
