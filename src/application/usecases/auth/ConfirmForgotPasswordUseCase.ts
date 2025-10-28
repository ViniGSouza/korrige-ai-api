import { IAuthProvider } from '../../contracts';

export interface ConfirmForgotPasswordUseCaseInput {
  email: string;
  code: string;
  newPassword: string;
}

export class ConfirmForgotPasswordUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(input: ConfirmForgotPasswordUseCaseInput): Promise<void> {
    const { email, code, newPassword } = input;

    await this.authProvider.confirmForgotPassword({
      email,
      code,
      newPassword,
    });
  }
}
