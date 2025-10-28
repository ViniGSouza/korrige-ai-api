export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

export interface SignUpResult {
  userId: string;
  email: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface SignInResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ConfirmSignUpParams {
  email: string;
  code: string;
}

export interface RefreshTokenParams {
  refreshToken: string;
}

export interface ForgotPasswordParams {
  email: string;
}

export interface ConfirmForgotPasswordParams {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordParams {
  accessToken: string;
  oldPassword: string;
  newPassword: string;
}

export interface IAuthProvider {
  signUp(params: SignUpParams): Promise<SignUpResult>;
  signIn(params: SignInParams): Promise<SignInResult>;
  confirmSignUp(params: ConfirmSignUpParams): Promise<void>;
  refreshToken(params: RefreshTokenParams): Promise<Omit<SignInResult, 'refreshToken'>>;
  forgotPassword(params: ForgotPasswordParams): Promise<void>;
  confirmForgotPassword(params: ConfirmForgotPasswordParams): Promise<void>;
  changePassword(params: ChangePasswordParams): Promise<void>;
}
