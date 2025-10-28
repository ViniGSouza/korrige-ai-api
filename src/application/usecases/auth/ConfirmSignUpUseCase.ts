import { IAuthProvider } from '../../contracts';

export interface ConfirmSignUpUseCaseInput {
  email: string;
  code: string;
}

export class ConfirmSignUpUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(input: ConfirmSignUpUseCaseInput): Promise<void> {
    const { email, code } = input;

    await this.authProvider.confirmSignUp({
      email,
      code,
    });
  }
}
