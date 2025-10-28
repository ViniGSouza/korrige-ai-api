import {
  SignUpUseCase,
  SignInUseCase,
  ConfirmSignUpUseCase,
  RefreshTokenUseCase,
  ForgotPasswordUseCase,
  ConfirmForgotPasswordUseCase,
  ChangePasswordUseCase,
} from '../../usecases/auth';

export class AuthController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly confirmSignUpUseCase: ConfirmSignUpUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly confirmForgotPasswordUseCase: ConfirmForgotPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase
  ) {}

  async signUp(data: { email: string; password: string; name: string; phoneNumber?: string }) {
    return this.signUpUseCase.execute(data);
  }

  async signIn(data: { email: string; password: string }) {
    return this.signInUseCase.execute(data);
  }

  async confirmSignUp(data: { email: string; code: string }) {
    return this.confirmSignUpUseCase.execute(data);
  }

  async refreshToken(data: { refreshToken: string }) {
    return this.refreshTokenUseCase.execute(data);
  }

  async forgotPassword(data: { email: string }) {
    return this.forgotPasswordUseCase.execute(data);
  }

  async confirmForgotPassword(data: { email: string; code: string; newPassword: string }) {
    return this.confirmForgotPasswordUseCase.execute(data);
  }

  async changePassword(data: { accessToken: string; oldPassword: string; newPassword: string }) {
    return this.changePasswordUseCase.execute(data);
  }
}
