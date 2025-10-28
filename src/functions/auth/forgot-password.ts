import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { CognitoService } from "../../shared/services/cognito.service.js";
import { forgotPasswordSchema } from "../../shared/schemas/auth.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError } from "../../shared/errors/index.js";

const logger = new Logger("ForgotPassword");
const cognitoService = new CognitoService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info("Iniciando recuperação de senha");

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = forgotPasswordSchema.parse(JSON.parse(event.body));

    await cognitoService.forgotPassword(body.email);

    logger.info("Código de recuperação enviado com sucesso");

    return successResponse({
      message: "Código de recuperação enviado para o email",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    logger.error("Erro ao solicitar recuperação de senha", error as Error);
    return errorResponse(error as Error, 500);
  }
};
