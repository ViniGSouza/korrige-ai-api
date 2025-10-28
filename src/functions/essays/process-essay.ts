import type { SQSHandler, SQSBatchResponse } from "aws-lambda";
import { container } from "../../kernel/di/container.js";
import { Logger } from "../../shared/utils/logger.js";
import type { SQSEssayMessage } from "../../shared/types/index.js";

const logger = new Logger("ProcessEssay");

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    try {
      const message: SQSEssayMessage = JSON.parse(record.body);
      const { essayId, userId, aiProvider } = message;

      logger.info("Processando redação", { essayId, userId, aiProvider });

      await container.processEssayUseCase.execute({
        essayId,
        userId,
        aiProvider,
      });

      logger.info("Redação processada com sucesso", { essayId });
    } catch (error) {
      logger.error("Erro ao processar redação", error as Error, {
        messageId: record.messageId,
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return { batchItemFailures };
};
