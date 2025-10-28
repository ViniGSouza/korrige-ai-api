import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  IAuthProvider,
  SignUpParams,
  SignUpResult,
  SignInParams,
  SignInResult,
  ConfirmSignUpParams,
  RefreshTokenParams,
  ForgotPasswordParams,
  ConfirmForgotPasswordParams,
  ChangePasswordParams,
} from "../../../application/contracts";
import { config } from "src/config";

export class CognitoAuthProvider implements IAuthProvider {
  private client: CognitoIdentityProviderClient;

  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: config.aws.region,
    });
  }

  async signUp(params: SignUpParams): Promise<SignUpResult> {
    const { email, password, name, phoneNumber } = params;

    const command = new SignUpCommand({
      ClientId: config.cognito.userPoolClientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: name },
        ...(phoneNumber ? [{ Name: "phone_number", Value: phoneNumber }] : []),
      ],
    });

    const response = await this.client.send(command);

    return {
      userId: response.UserSub!,
      email,
    };
  }

  async signIn(params: SignInParams): Promise<SignInResult> {
    const { email, password } = params;

    const command = new InitiateAuthCommand({
      ClientId: config.cognito.userPoolClientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await this.client.send(command);

    if (!response.AuthenticationResult) {
      throw new Error("Authentication failed");
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      refreshToken: response.AuthenticationResult.RefreshToken!,
      expiresIn: response.AuthenticationResult.ExpiresIn!,
    };
  }

  async confirmSignUp(params: ConfirmSignUpParams): Promise<void> {
    const { email, code } = params;

    const command = new ConfirmSignUpCommand({
      ClientId: config.cognito.userPoolClientId,
      Username: email,
      ConfirmationCode: code,
    });

    await this.client.send(command);
  }

  async refreshToken(
    params: RefreshTokenParams
  ): Promise<Omit<SignInResult, "refreshToken">> {
    const { refreshToken } = params;

    const command = new InitiateAuthCommand({
      ClientId: config.cognito.userPoolClientId,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await this.client.send(command);

    if (!response.AuthenticationResult) {
      throw new Error("Token refresh failed");
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      expiresIn: response.AuthenticationResult.ExpiresIn!,
    };
  }

  async forgotPassword(params: ForgotPasswordParams): Promise<void> {
    const { email } = params;

    const command = new ForgotPasswordCommand({
      ClientId: config.cognito.userPoolClientId,
      Username: email,
    });

    await this.client.send(command);
  }

  async confirmForgotPassword(
    params: ConfirmForgotPasswordParams
  ): Promise<void> {
    const { email, code, newPassword } = params;

    const command = new ConfirmForgotPasswordCommand({
      ClientId: config.cognito.userPoolClientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    await this.client.send(command);
  }

  async changePassword(params: ChangePasswordParams): Promise<void> {
    const { accessToken, oldPassword, newPassword } = params;

    const command = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
    });

    await this.client.send(command);
  }
}
