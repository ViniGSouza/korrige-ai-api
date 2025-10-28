import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { CognitoService } from "../../shared/services/cognito.service.js";
import { changePasswordSchema } from "../../shared/schemas/auth.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import {
  ValidationError,
  UnauthorizedError,
} from "../../shared/errors/index.js";

const logger = new Logger("ChangePassword");
const cognitoService = new CognitoService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info("Alterando senha do usuário");

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const authHeader =
      event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError("Authorization header is required");
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const body = changePasswordSchema.parse(JSON.parse(event.body));

    await cognitoService.changePassword(
      accessToken,
      body.oldPassword,
      body.newPassword
    );

    logger.info("Senha alterada com sucesso");

    return successResponse({
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    if (error instanceof UnauthorizedError) {
      logger.error("Unauthorized", error);
      return errorResponse(error.message, 401);
    }

    logger.error("Erro ao alterar senha", error as Error);
    return errorResponse(error as Error, 500);
  }
};
