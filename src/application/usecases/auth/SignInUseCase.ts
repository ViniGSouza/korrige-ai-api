import { IAuthProvider } from '../../contracts';

export interface SignInUseCaseInput {
  email: string;
  password: string;
}

export interface SignInUseCaseOutput {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class SignInUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(input: SignInUseCaseInput): Promise<SignInUseCaseOutput> {
    const { email, password } = input;

    const result = await this.authProvider.signIn({
      email,
      password,
    });

    return result;
  }
}
