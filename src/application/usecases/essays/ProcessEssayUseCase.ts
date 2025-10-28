import { IEssayRepository, IAIProvider, IFileProcessor } from '../../contracts';
import { NotFoundError } from '../../errors';
import { Logger } from '../../../shared/utils/logger';

const logger = new Logger('ProcessEssayUseCase');

export interface ProcessEssayUseCaseInput {
  essayId: string;
  userId: string;
  aiProvider: 'claude' | 'openai';
}

export class ProcessEssayUseCase {
  constructor(
    private readonly essayRepository: IEssayRepository,
    private readonly claudeProvider: IAIProvider,
    private readonly openaiProvider: IAIProvider,
    private readonly fileProcessor: IFileProcessor
  ) {}

  async execute(input: ProcessEssayUseCaseInput): Promise<void> {
    const { essayId, userId, aiProvider } = input;
    const startTime = Date.now();

    try {
      // Atualizar status para processing
      await this.essayRepository.update(essayId, userId, {
        status: 'processing',
      });

      // Buscar redação
      const essay = await this.essayRepository.findById(essayId, userId);
      if (!essay) {
        throw new NotFoundError('Redação não encontrada');
      }

      let essayText = essay.content || '';

      // Se há arquivo, extrair texto
      if (essay.fileKey && essay.fileType) {
        logger.info('Extracting text from file', { fileKey: essay.fileKey, fileType: essay.fileType });
        essayText = await this.fileProcessor.extractText({
          fileKey: essay.fileKey,
          fileType: essay.fileType,
        });

        // Salvar texto extraído
        await this.essayRepository.update(essayId, userId, {
          extractedText: essayText,
        });
      }

      // Selecionar provider de IA
      const provider = aiProvider === 'claude' ? this.claudeProvider : this.openaiProvider;

      // Corrigir redação
      logger.info('Correcting essay with AI', { aiProvider, essayId });
      const correction = await provider.correctEssay({
        essayText,
        essayTitle: essay.title,
      });

      const processingTimeMs = Date.now() - startTime;

      // Atualizar redação com correção
      await this.essayRepository.update(essayId, userId, {
        status: 'completed',
        correction: {
          ...correction,
          processingTimeMs,
        },
      });

      logger.info('Essay corrected successfully', { essayId, processingTimeMs });
    } catch (error) {
      logger.error('Error processing essay', error as Error, { essayId, userId });

      // Atualizar status para failed
      await this.essayRepository.update(essayId, userId, {
        status: 'failed',
      });

      throw error;
    }
  }
}
