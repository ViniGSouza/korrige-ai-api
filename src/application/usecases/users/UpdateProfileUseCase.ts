import { IUserRepository } from '../../contracts';
import { User } from '../../entities';
import { NotFoundError } from '../../errors';

export interface UpdateProfileUseCaseInput {
  userId: string;
  name?: string;
  phoneNumber?: string;
}

export type UpdateProfileUseCaseOutput = User;

export class UpdateProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: UpdateProfileUseCaseInput): Promise<UpdateProfileUseCaseOutput> {
    const { userId, name, phoneNumber } = input;

    // Verificar se usuário existe
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Atualizar perfil
    const updatedUser = await this.userRepository.update(userId, {
      name,
      phoneNumber,
    });

    return updatedUser;
  }
}
