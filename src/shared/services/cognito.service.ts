import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
  GetUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "../../config/index.js";

const client = new CognitoIdentityProviderClient({ region: config.aws.region });

export interface SignUpResult {
  userId: string;
  userConfirmed: boolean;
}

export interface AuthResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class CognitoService {
  async signUp(
    email: string,
    password: string,
    name: string,
    phoneNumber?: string
  ): Promise<SignUpResult> {
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

    const response = await client.send(command);

    return {
      userId: response.UserSub!,
      userConfirmed: response.UserConfirmed || false,
    };
  }

  async confirmSignUp(email: string, confirmationCode: string): Promise<void> {
    const command = new ConfirmSignUpCommand({
      ClientId: config.cognito.userPoolClientId,
      Username: email,
      ConfirmationCode: confirmationCode,
    });

    await client.send(command);
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const command = new InitiateAuthCommand({
      ClientId: config.cognito.userPoolClientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);

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

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    const command = new InitiateAuthCommand({
      ClientId: config.cognito.userPoolClientId,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await client.send(command);

    if (!response.AuthenticationResult) {
      throw new Error("Token refresh failed");
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      refreshToken: refreshToken, // Refresh token não muda
      expiresIn: response.AuthenticationResult.ExpiresIn!,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const command = new ForgotPasswordCommand({
      ClientId: config.cognito.userPoolClientId,
      Username: email,
    });

    await client.send(command);
  }

  async confirmForgotPassword(
    email: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: config.cognito.userPoolClientId,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });

    await client.send(command);
  }

  async changePassword(
    accessToken: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const command = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
    });

    await client.send(command);
  }

  async getUser(accessToken: string) {
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const response = await client.send(command);

    return {
      username: response.Username!,
      attributes: response.UserAttributes?.reduce((acc, attr) => {
        if (attr.Name && attr.Value) {
          acc[attr.Name] = attr.Value;
        }
        return acc;
      }, {} as Record<string, string>),
    };
  }

  async adminGetUser(userId: string) {
    const command = new AdminGetUserCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: userId,
    });

    const response = await client.send(command);

    return {
      username: response.Username!,
      attributes: response.UserAttributes?.reduce((acc, attr) => {
        if (attr.Name && attr.Value) {
          acc[attr.Name] = attr.Value;
        }
        return acc;
      }, {} as Record<string, string>),
    };
  }

  async updateUserAttributes(
    userId: string,
    attributes: Record<string, string>
  ): Promise<void> {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: userId,
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    });

    await client.send(command);
  }
}
