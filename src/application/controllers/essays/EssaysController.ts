import {
  CreateEssayUseCase,
  ListEssaysUseCase,
  GetEssayUseCase,
  DeleteEssayUseCase,
  GetUploadUrlUseCase,
  ProcessEssayUseCase,
} from '../../usecases/essays';
import { EssayStatus } from '../../entities';

export class EssaysController {
  constructor(
    private readonly createEssayUseCase: CreateEssayUseCase,
    private readonly listEssaysUseCase: ListEssaysUseCase,
    private readonly getEssayUseCase: GetEssayUseCase,
    private readonly deleteEssayUseCase: DeleteEssayUseCase,
    private readonly getUploadUrlUseCase: GetUploadUrlUseCase,
    private readonly processEssayUseCase: ProcessEssayUseCase
  ) {}

  async createEssay(data: {
    userId: string;
    title: string;
    content?: string;
    fileKey?: string;
    fileType?: 'image' | 'pdf' | 'docx' | 'text';
    aiProvider?: 'claude' | 'openai';
  }) {
    return this.createEssayUseCase.execute(data);
  }

  async listEssays(data: {
    userId: string;
    status?: EssayStatus;
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }) {
    return this.listEssaysUseCase.execute(data);
  }

  async getEssay(essayId: string, userId: string) {
    return this.getEssayUseCase.execute({ essayId, userId });
  }

  async deleteEssay(essayId: string, userId: string) {
    return this.deleteEssayUseCase.execute({ essayId, userId });
  }

  async getUploadUrl(data: { userId: string; fileExtension: string; contentType: string }) {
    return this.getUploadUrlUseCase.execute(data);
  }

  async processEssay(data: { essayId: string; userId: string; aiProvider: 'claude' | 'openai' }) {
    return this.processEssayUseCase.execute(data);
  }
}
