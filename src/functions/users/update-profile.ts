import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { DynamoDBService } from "../../shared/services/dynamodb.service.js";
import { CognitoService } from "../../shared/services/cognito.service.js";
import { updateProfileSchema } from "../../shared/schemas/essay.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError, NotFoundError } from "../../shared/errors/index.js";
import type { User } from "../../shared/types/index.js";

const logger = new Logger("UpdateProfile");
const dynamoDbService = new DynamoDBService();
const cognitoService = new CognitoService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub as string;

    if (!userId) {
      throw new NotFoundError("User not found");
    }

    logger.info("Atualizando perfil do usuário", { userId });

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = updateProfileSchema.parse(JSON.parse(event.body));

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name) {
      updates.name = body.name;
    }

    if (body.phoneNumber !== undefined) {
      updates.phoneNumber = body.phoneNumber;
    }

    const updatedUser = await dynamoDbService.update<User>(
      `USER#${userId}`,
      `USER#${userId}`,
      updates
    );

    const cognitoUpdates: Record<string, string> = {};

    if (body.name) {
      cognitoUpdates.name = body.name;
    }

    if (body.phoneNumber) {
      cognitoUpdates.phone_number = body.phoneNumber;
    }

    if (Object.keys(cognitoUpdates).length > 0) {
      await cognitoService.updateUserAttributes(userId, cognitoUpdates);
    }

    logger.info("Perfil atualizado com sucesso", { userId });

    const {
      PK: _PK,
      SK: _SK,
      GSI1PK: _GSI1PK,
      GSI1SK: _GSI1SK,
      type: _type,
      ...profile
    } = updatedUser;

    return successResponse(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    if (error instanceof NotFoundError) {
      logger.error("Usuário não encontrado", error);
      return errorResponse(error.message, 404);
    }

    logger.error("Erro ao atualizar perfil", error as Error);
    return errorResponse(error as Error, 500);
  }
};
