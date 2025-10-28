import { IEssayRepository } from '../../contracts';
import { Essay } from '../../entities';
import { NotFoundError } from '../../errors';

export interface GetEssayUseCaseInput {
  essayId: string;
  userId: string;
}

export type GetEssayUseCaseOutput = Essay;

export class GetEssayUseCase {
  constructor(private readonly essayRepository: IEssayRepository) {}

  async execute(input: GetEssayUseCaseInput): Promise<GetEssayUseCaseOutput> {
    const { essayId, userId } = input;

    const essay = await this.essayRepository.findById(essayId, userId);

    if (!essay) {
      throw new NotFoundError('Redação não encontrada');
    }

    return essay;
  }
}
