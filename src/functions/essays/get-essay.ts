import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBService } from "../../shared/services/dynamodb.service.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { NotFoundError, ForbiddenError } from "../../shared/errors/index.js";
import type { Essay } from "../../shared/types/index.js";

const logger = new Logger("GetEssay");
const dynamoDbService = new DynamoDBService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub as string;
    const essayId = event.pathParameters?.essayId;

    if (!userId) {
      throw new NotFoundError("User not found");
    }

    if (!essayId) {
      throw new NotFoundError("Essay ID is required");
    }

    logger.info("Obtendo redação", { userId, essayId });

    const essay = await dynamoDbService.get<Essay>(
      `USER#${userId}`,
      `ESSAY#${essayId}`
    );

    if (!essay) {
      throw new NotFoundError("Essay not found");
    }

    if (essay.userId !== userId) {
      throw new ForbiddenError(
        "You do not have permission to access this essay"
      );
    }

    const {
      PK: _PK,
      SK: _SK,
      GSI1PK: _GSI1PK,
      GSI1SK: _GSI1SK,
      GSI2PK: _GSI2PK,
      GSI2SK: _GSI2SK,
      type: _type,
      ...essayResponse
    } = essay;

    return successResponse(essayResponse);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("Redação não encontrada", error);
      return errorResponse(error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      logger.error("Acesso negado", error);
      return errorResponse(error.message, 403);
    }

    logger.error("Erro ao obter redação", error as Error);
    return errorResponse(error as Error, 500);
  }
};
