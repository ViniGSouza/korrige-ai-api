import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { CognitoService } from "../../shared/services/cognito.service.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError } from "../../shared/errors/index.js";

const logger = new Logger("ConfirmSignUp");
const cognitoService = new CognitoService();

const confirmSignUpSchema = z.object({
  email: z.string().email("Email inválido"),
  confirmationCode: z.string().min(1, "Código de confirmação é obrigatório"),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info("Iniciando confirmação de registro");

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = confirmSignUpSchema.parse(JSON.parse(event.body));

    await cognitoService.confirmSignUp(body.email, body.confirmationCode);

    logger.info("Registro confirmado com sucesso", { email: body.email });

    return successResponse({
      message: "Email confirmado com sucesso! Você já pode fazer login.",
      confirmed: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    logger.error("Erro ao confirmar registro", error as Error);

    // Tratar erros específicos do Cognito
    const errorMessage = (error as Error).message;
    if (errorMessage.includes("CodeMismatchException")) {
      return errorResponse("Código de confirmação inválido", 400);
    }
    if (errorMessage.includes("ExpiredCodeException")) {
      return errorResponse(
        "Código de confirmação expirado. Solicite um novo código.",
        400
      );
    }
    if (errorMessage.includes("NotAuthorizedException")) {
      return errorResponse("Usuário já confirmado", 400);
    }

    return errorResponse(error as Error, 500);
  }
};
