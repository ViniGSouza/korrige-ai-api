import { IAuthProvider } from '../../contracts';

export interface ForgotPasswordUseCaseInput {
  email: string;
}

export class ForgotPasswordUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(input: ForgotPasswordUseCaseInput): Promise<void> {
    const { email } = input;

    await this.authProvider.forgotPassword({
      email,
    });
  }
}
