import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBService } from "../../shared/services/dynamodb.service.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { NotFoundError } from "../../shared/errors/index.js";
import type { Essay } from "../../shared/types/index.js";

const logger = new Logger("ListEssays");
const dynamoDbService = new DynamoDBService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub as string;

    if (!userId) {
      throw new NotFoundError("User not found");
    }

    logger.info("Listando redações do usuário", { userId });

    const essays = await dynamoDbService.query<Essay>(
      "GSI2PK = :pk",
      {
        ":pk": `ESSAY#USER#${userId}`,
      },
      "GSI2"
    );

    const sortedEssays = essays.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const essaysResponse = sortedEssays.map(
      ({
        PK: _PK,
        SK: _SK,
        GSI1PK: _GSI1PK,
        GSI1SK: _GSI1SK,
        GSI2PK: _GSI2PK,
        GSI2SK: _GSI2SK,
        type: _type,
        ...essay
      }) => essay
    );

    return successResponse({
      essays: essaysResponse,
      total: essaysResponse.length,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("Usuário não encontrado", error);
      return errorResponse(error.message, 404);
    }

    logger.error("Erro ao listar redações", error as Error);
    return errorResponse(error as Error, 500);
  }
};
