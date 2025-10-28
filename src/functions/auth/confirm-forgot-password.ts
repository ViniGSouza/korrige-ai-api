import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { CognitoService } from "../../shared/services/cognito.service.js";
import { confirmForgotPasswordSchema } from "../../shared/schemas/auth.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError } from "../../shared/errors/index.js";

const logger = new Logger("ConfirmForgotPassword");
const cognitoService = new CognitoService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info("Confirmando nova senha");

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = confirmForgotPasswordSchema.parse(JSON.parse(event.body));

    await cognitoService.confirmForgotPassword(
      body.email,
      body.confirmationCode,
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

    logger.error("Erro ao confirmar nova senha", error as Error);
    return errorResponse(error as Error, 500);
  }
};
