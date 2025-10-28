import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import KSUID from "ksuid";
import { DynamoDBService } from "../../shared/services/dynamodb.service.js";
import { SQSService } from "../../shared/services/sqs.service.js";
import { createEssaySchema } from "../../shared/schemas/essay.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError, NotFoundError } from "../../shared/errors/index.js";
import type { Essay, SQSEssayMessage } from "../../shared/types/index.js";

const logger = new Logger("CreateEssay");
const dynamoDbService = new DynamoDBService();
const sqsService = new SQSService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub as string;

    if (!userId) {
      throw new NotFoundError("User not found");
    }

    logger.info("Criando redação", { userId });

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = createEssaySchema.parse(JSON.parse(event.body));

    const essayId = KSUID.randomSync().string;
    const now = new Date().toISOString();

    const essay: Essay = {
      PK: `USER#${userId}`,
      SK: `ESSAY#${essayId}`,
      GSI1PK: "ESSAY#STATUS#pending",
      GSI1SK: `ESSAY#${now}`,
      GSI2PK: `ESSAY#USER#${userId}`,
      GSI2SK: `ESSAY#${now}`,
      essayId,
      userId,
      title: body.title,
      content: body.content,
      fileKey: body.fileKey,
      fileType: body.fileType,
      status: "pending",
      aiProvider: body.aiProvider,
      createdAt: now,
      updatedAt: now,
      type: "ESSAY",
    };

    await dynamoDbService.put(essay);

    logger.info("Redação criada no DynamoDB", { essayId });

    const sqsMessage: SQSEssayMessage = {
      essayId,
      userId,
      aiProvider: body.aiProvider,
    };

    const messageId = await sqsService.sendMessage(sqsMessage);

    logger.info("Mensagem enviada para SQS", { essayId, messageId });

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

    return successResponse(essayResponse, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    if (error instanceof NotFoundError) {
      logger.error("Usuário não encontrado", error);
      return errorResponse(error.message, 404);
    }

    logger.error("Erro ao criar redação", error as Error);
    return errorResponse(error as Error, 500);
  }
};
