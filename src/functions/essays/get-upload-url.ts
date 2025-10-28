import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import KSUID from "ksuid";
import { S3Service } from "../../shared/services/s3.service.js";
import { getUploadUrlSchema } from "../../shared/schemas/essay.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError, NotFoundError } from "../../shared/errors/index.js";
import { config } from "../../config/index.js";

const logger = new Logger("GetUploadUrl");
const s3Service = new S3Service();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub as string;

    if (!userId) {
      throw new NotFoundError("User not found");
    }

    logger.info("Gerando URL de upload", { userId });

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = getUploadUrlSchema.parse(JSON.parse(event.body));

    if (body.fileSize > config.upload.maxFileSize) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${
          config.upload.maxFileSize / 1024 / 1024
        }MB`
      );
    }

    if (!config.upload.allowedFileTypes.includes(body.fileType)) {
      throw new ValidationError(
        `File type ${
          body.fileType
        } is not allowed. Allowed types: ${config.upload.allowedFileTypes.join(
          ", "
        )}`
      );
    }

    const fileExtension = body.fileName.split(".").pop();
    const fileKey = `essays/${userId}/${
      KSUID.randomSync().string
    }.${fileExtension}`;

    const uploadUrl = await s3Service.getPresignedUploadUrl(
      fileKey,
      body.fileType,
      config.upload.presignedUrlExpiration
    );

    logger.info("URL de upload gerada com sucesso", { userId, fileKey });

    return successResponse({
      uploadUrl,
      fileKey,
      expiresIn: config.upload.presignedUrlExpiration,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    if (error instanceof ValidationError) {
      logger.error("Validation error", error);
      return errorResponse(error.message, 400);
    }

    if (error instanceof NotFoundError) {
      logger.error("Usuário não encontrado", error);
      return errorResponse(error.message, 404);
    }

    logger.error("Erro ao gerar URL de upload", error as Error);
    return errorResponse(error as Error, 500);
  }
};
