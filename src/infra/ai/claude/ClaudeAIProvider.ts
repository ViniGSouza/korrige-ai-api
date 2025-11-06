import Anthropic from "@anthropic-ai/sdk";
import dedent from "ts-dedent";
import {
  IAIProvider,
  CorrectEssayParams,
} from "../../../application/contracts";
import { EssayCorrection } from "../../../application/entities";
import { Logger } from "../../../shared/utils/logger";
import { config } from "src/config";
import { essayCorrectionSchema } from "../shared/schemas/essaySchema";
import { getEssayPrompt } from "../shared/prompts/getEssayPrompt";

const logger = new Logger("ClaudeAIProvider");

export class ClaudeAIProvider implements IAIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.ai.anthropic.apiKey,
    });
  }

  async correctEssay(params: CorrectEssayParams): Promise<EssayCorrection> {
    const { essayText, essayTitle } = params;
    const startTime = Date.now();

    try {
      logger.info("Iniciando correção de redação com Claude");

      const message = await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
        system: getEssayPrompt(),
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: dedent`
              Please evaluate the following ENEM essay and return ONLY a valid JSON response:

              TITLE: ${essayTitle}

              ESSAY:
              ${essayText}
            `,
          },
        ],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      if (!responseText) {
        logger.error(
          "Claude retornou resposta vazia",
          new Error("Empty response")
        );
        throw new Error("Failed to get response from Claude");
      }

      // Limpar markdown se presente
      const cleanedText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Validação com Zod
      const { success, data, error } = essayCorrectionSchema.safeParse(
        JSON.parse(cleanedText)
      );

      if (!success) {
        logger.error("Erro ao validar resposta do Claude", error, {
          responseText: cleanedText,
          zodErrors: error.issues,
        });
        throw new Error("Failed to validate Claude response");
      }

      const processingTimeMs = Date.now() - startTime;

      logger.info("Correção concluída com Claude", {
        processingTimeMs,
        totalScore: data.totalScore,
      });

      return {
        ...data,
        processedAt: new Date().toISOString(),
        processingTimeMs,
      };
    } catch (error) {
      logger.error("Erro ao corrigir redação com Claude", error as Error);
      throw error;
    }
  }
}
