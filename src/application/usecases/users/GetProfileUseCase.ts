import { IUserRepository } from '../../contracts';
import { User } from '../../entities';
import { NotFoundError } from '../../errors';

export interface GetProfileUseCaseInput {
  userId: string;
}

export type GetProfileUseCaseOutput = User;

export class GetProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: GetProfileUseCaseInput): Promise<GetProfileUseCaseOutput> {
    const { userId } = input;

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return user;
  }
}
