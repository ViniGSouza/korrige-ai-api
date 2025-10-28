import { IEssayRepository, ListEssaysResult } from '../../contracts';
import { EssayStatus } from '../../entities';

export interface ListEssaysUseCaseInput {
  userId: string;
  status?: EssayStatus;
  limit?: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export type ListEssaysUseCaseOutput = ListEssaysResult;

export class ListEssaysUseCase {
  constructor(private readonly essayRepository: IEssayRepository) {}

  async execute(input: ListEssaysUseCaseInput): Promise<ListEssaysUseCaseOutput> {
    const { userId, status, limit = 20, lastEvaluatedKey } = input;

    const result = await this.essayRepository.findByUserId({
      userId,
      status,
      limit,
      lastEvaluatedKey,
    });

    return result;
  }
}
