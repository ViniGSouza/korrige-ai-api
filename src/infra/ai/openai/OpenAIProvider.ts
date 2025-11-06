import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import dedent from "ts-dedent";
import {
  IAIProvider,
  CorrectEssayParams,
} from "../../../application/contracts";
import { EssayCorrection } from "../../../application/entities";
import { config } from "src/config";
import { Logger } from "../../../shared/utils/logger";
import { essayCorrectionSchema } from "../shared/schemas/essaySchema";
import { getEssayPrompt } from "../shared/prompts/getEssayPrompt";

const logger = new Logger("OpenAIProvider");

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.ai.openai.apiKey,
    });
  }

  async correctEssay(params: CorrectEssayParams): Promise<EssayCorrection> {
    const { essayText, essayTitle } = params;
    const startTime = Date.now();

    try {
      logger.info("Iniciando correção de redação com OpenAI");

      const completion = await this.client.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: zodResponseFormat(
          essayCorrectionSchema,
          "essay_correction"
        ),
        messages: [
          {
            role: "system",
            content: getEssayPrompt(),
          },
          {
            role: "user",
            content: dedent`
              Please evaluate the following ENEM essay:

              TITLE: ${essayTitle}

              ESSAY:
              ${essayText}
            `,
          },
        ],
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        logger.error(
          "OpenAI retornou resposta vazia",
          new Error("Empty response")
        );
        throw new Error("Failed to get response from OpenAI");
      }

      const { success, data, error } = essayCorrectionSchema.safeParse(
        JSON.parse(responseText)
      );

      if (!success) {
        logger.error("Erro ao validar resposta do OpenAI", error, {
          responseText,
          zodErrors: error.issues,
        });
        throw new Error("Failed to validate OpenAI response");
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        ...data,
        processedAt: new Date().toISOString(),
        processingTimeMs,
      };
    } catch (error) {
      logger.error("Erro ao corrigir redação com OpenAI", error as Error);
      throw error;
    }
  }
}
