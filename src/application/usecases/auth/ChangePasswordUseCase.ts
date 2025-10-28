import { IAuthProvider } from '../../contracts';

export interface ChangePasswordUseCaseInput {
  accessToken: string;
  oldPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(input: ChangePasswordUseCaseInput): Promise<void> {
    const { accessToken, oldPassword, newPassword } = input;

    await this.authProvider.changePassword({
      accessToken,
      oldPassword,
      newPassword,
    });
  }
}
