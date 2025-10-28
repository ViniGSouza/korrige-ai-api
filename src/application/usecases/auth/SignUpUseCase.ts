import { IAuthProvider, IUserRepository } from '../../contracts';
import { ConflictError } from '../../errors';

export interface SignUpUseCaseInput {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

export interface SignUpUseCaseOutput {
  userId: string;
  email: string;
}

export class SignUpUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(input: SignUpUseCaseInput): Promise<SignUpUseCaseOutput> {
    const { email, password, name, phoneNumber } = input;

    // Verificar se usuário já existe
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Usuário já cadastrado com este email');
    }

    // Criar usuário no Cognito
    const { userId } = await this.authProvider.signUp({
      email,
      password,
      name,
      phoneNumber,
    });

    // Criar usuário no banco de dados
    await this.userRepository.create({
      userId,
      email,
      name,
      phoneNumber,
    });

    return { userId, email };
  }
}
