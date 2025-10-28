import { IAuthProvider } from '../../contracts';

export interface RefreshTokenUseCaseInput {
  refreshToken: string;
}

export interface RefreshTokenUseCaseOutput {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export class RefreshTokenUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(input: RefreshTokenUseCaseInput): Promise<RefreshTokenUseCaseOutput> {
    const { refreshToken } = input;

    const result = await this.authProvider.refreshToken({
      refreshToken,
    });

    return result;
  }
}
