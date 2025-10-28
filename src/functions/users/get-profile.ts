import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBService } from "../../shared/services/dynamodb.service.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { NotFoundError } from "../../shared/errors/index.js";
import type { User } from "../../shared/types/index.js";

const logger = new Logger("GetProfile");
const dynamoDbService = new DynamoDBService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub as string;

    if (!userId) {
      throw new NotFoundError("User not found");
    }

    logger.info("Obtendo perfil do usuário", { userId });

    const user = await dynamoDbService.get<User>(
      `USER#${userId}`,
      `USER#${userId}`
    );

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const {
      PK: _PK,
      SK: _SK,
      GSI1PK: _GSI1PK,
      GSI1SK: _GSI1SK,
      type: _type,
      ...profile
    } = user;

    return successResponse(profile);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("Usuário não encontrado", error);
      return errorResponse(error.message, 404);
    }

    logger.error("Erro ao obter perfil do usuário", error as Error);
    return errorResponse(error as Error, 500);
  }
};
