import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { CognitoService } from "../../shared/services/cognito.service.js";
import { refreshTokenSchema } from "../../shared/schemas/auth.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError } from "../../shared/errors/index.js";

const logger = new Logger("RefreshToken");
const cognitoService = new CognitoService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info("Renovando token de acesso");

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = refreshTokenSchema.parse(JSON.parse(event.body));

    const authResult = await cognitoService.refreshToken(body.refreshToken);

    logger.info("Token renovado com sucesso");

    return successResponse({
      accessToken: authResult.accessToken,
      idToken: authResult.idToken,
      refreshToken: authResult.refreshToken,
      expiresIn: authResult.expiresIn,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    logger.error("Erro ao renovar token", error as Error);
    return errorResponse("Invalid refresh token", 401);
  }
};
