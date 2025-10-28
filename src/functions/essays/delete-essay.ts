import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBService } from "../../shared/services/dynamodb.service.js";
import { S3Service } from "../../shared/services/s3.service.js";
import {
  noContentResponse,
  errorResponse,
} from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { NotFoundError, ForbiddenError } from "../../shared/errors/index.js";
import type { Essay } from "../../shared/types/index.js";

const logger = new Logger("DeleteEssay");
const dynamoDbService = new DynamoDBService();
const s3Service = new S3Service();

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

    logger.info("Deletando redação", { userId, essayId });

    const essay = await dynamoDbService.get<Essay>(
      `USER#${userId}`,
      `ESSAY#${essayId}`
    );

    if (!essay) {
      throw new NotFoundError("Essay not found");
    }

    if (essay.userId !== userId) {
      throw new ForbiddenError(
        "You do not have permission to delete this essay"
      );
    }

    if (essay.fileKey) {
      try {
        await s3Service.deleteObject(essay.fileKey);
        logger.info("Arquivo deletado do S3", { fileKey: essay.fileKey });
      } catch (error) {
        logger.warn("Erro ao deletar arquivo do S3", {
          error,
          fileKey: essay.fileKey,
        });
      }
    }

    await dynamoDbService.delete(`USER#${userId}`, `ESSAY#${essayId}`);

    logger.info("Redação deletada com sucesso", { essayId });

    return noContentResponse();
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("Redação não encontrada", error);
      return errorResponse(error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      logger.error("Acesso negado", error);
      return errorResponse(error.message, 403);
    }

    logger.error("Erro ao deletar redação", error as Error);
    return errorResponse(error as Error, 500);
  }
};
