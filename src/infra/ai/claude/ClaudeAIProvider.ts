import Anthropic from "@anthropic-ai/sdk";
import {
  IAIProvider,
  CorrectEssayParams,
} from "../../../application/contracts";
import { EssayCorrection } from "../../../application/entities";
import { Logger } from "../../../shared/utils/logger";
import { config } from "src/config";

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
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt(essayTitle, essayText);

      logger.info("Iniciando correção de redação com Claude");

      const message = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      // Parse da resposta JSON
      const correction = this.parseResponse(responseText);

      const processingTimeMs = Date.now() - startTime;

      logger.info("Correção concluída com Claude", {
        processingTimeMs,
        totalScore: correction.totalScore,
      });

      return {
        ...correction,
        processedAt: new Date().toISOString(),
        processingTimeMs,
      };
    } catch (error) {
      logger.error("Erro ao corrigir redação com Claude", error as Error);
      throw error;
    }
  }

  private getSystemPrompt(): string {
    return `Você é um corretor especializado em redações do ENEM. Sua tarefa é avaliar redações seguindo rigorosamente os critérios oficiais do ENEM.

As 5 competências do ENEM são:

**Competência 1** (0-200 pontos): Demonstrar domínio da modalidade escrita formal da língua portuguesa.
- Avalie gramática, ortografia, pontuação, concordância, regência e ausência de marcas de oralidade.

**Competência 2** (0-200 pontos): Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa.
- Avalie compreensão do tema, desenvolvimento argumentativo e uso de repertório sociocultural.

**Competência 3** (0-200 pontos): Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.
- Avalie organização de ideias, coesão entre parágrafos e progressão argumentativa.

**Competência 4** (0-200 pontos): Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.
- Avalie uso de conectivos, coesão textual e encadeamento de ideias.

**Competência 5** (0-200 pontos): Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.
- A proposta deve conter: agente, ação, meio/modo, finalidade e detalhamento.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem markdown, sem explicações adicionais. O JSON deve seguir exatamente esta estrutura:

{
  "competency1": {
    "score": número entre 0-200,
    "feedback": "texto explicativo",
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "improvements": ["ponto a melhorar 1", "ponto a melhorar 2"]
  },
  "competency2": { ... },
  "competency3": { ... },
  "competency4": { ... },
  "competency5": { ... },
  "totalScore": soma das 5 competências (0-1000),
  "overallFeedback": "feedback geral sobre a redação"
}`;
  }

  private getUserPrompt(title: string, essayText: string): string {
    return `Corrija a seguinte redação do ENEM seguindo os critérios das 5 competências. Retorne APENAS o JSON com a avaliação, sem nenhum texto adicional antes ou depois.

TÍTULO: ${title}

REDAÇÃO:
${essayText}`;
  }

  private parseResponse(
    responseText: string
  ): Omit<EssayCorrection, "processedAt" | "processingTimeMs"> {
    try {
      const cleanedText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedText);

      if (
        !parsed.competency1 ||
        !parsed.competency2 ||
        !parsed.competency3 ||
        !parsed.competency4 ||
        !parsed.competency5
      ) {
        throw new Error("Invalid response structure");
      }

      return parsed;
    } catch (error) {
      logger.error(
        "Erro ao fazer parse da resposta do Claude",
        error as Error,
        {
          responseText,
        }
      );
      throw new Error("Failed to parse Claude response");
    }
  }
}
