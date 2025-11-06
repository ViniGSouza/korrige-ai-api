import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import {
  TextractClient,
  DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";
import {
  IFileProcessor,
  ProcessFileParams,
  IStorageProvider,
} from "../../application/contracts";
import { Logger } from "../../shared/utils/logger";
import { config } from "src/config";

const logger = new Logger("FileProcessorProvider");

// AWS Textract limits
const TEXTRACT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export class FileProcessorProvider implements IFileProcessor {
  private textractClient: TextractClient;

  constructor(private readonly storageProvider: IStorageProvider) {
    this.textractClient = new TextractClient({ region: config.aws.textractRegion });
    logger.info("Textract client initialized", { region: config.aws.textractRegion });
  }

  async extractText(params: ProcessFileParams): Promise<string> {
    const { fileKey, fileType } = params;

    logger.info("Extracting text from file", { fileKey, fileType });

    try {
      // Buscar arquivo do S3
      const fileBuffer = await this.storageProvider.getObject(fileKey);

      switch (fileType) {
        case "image":
          return await this.extractTextFromImage(fileBuffer);
        case "pdf":
          return await this.extractTextFromPDF(fileBuffer);
        case "docx":
          return await this.extractTextFromDOCX(fileBuffer);
        case "text":
          return fileBuffer.toString("utf-8");
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      logger.error("Error extracting text from file", error as Error, {
        fileKey,
        fileType,
      });
      throw error;
    }
  }

  private async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    logger.info("Extracting text from image using Textract", {
      originalSize: imageBuffer.length,
    });

    try {
      // Validar tamanho da imagem
      if (imageBuffer.length > TEXTRACT_MAX_SIZE) {
        const sizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (TEXTRACT_MAX_SIZE / (1024 * 1024)).toFixed(2);
        
        logger.warn("Image exceeds Textract size limit", {
          imageSize: imageBuffer.length,
          maxSize: TEXTRACT_MAX_SIZE,
        });
        
        throw new Error(
          `A imagem é muito grande (${sizeMB}MB). O tamanho máximo permitido é ${maxSizeMB}MB. Por favor, envie uma imagem menor.`
        );
      }

      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: imageBuffer,
        },
      });

      const response = await this.textractClient.send(command);

      if (!response.Blocks || response.Blocks.length === 0) {
        logger.warn("No text blocks detected in image");
        throw new Error(
          "Não foi possível detectar texto na imagem. Certifique-se de que a imagem contém texto legível."
        );
      }

      // Extract only LINE blocks to get organized text
      const lines = response.Blocks.filter(
        (block) => block.BlockType === "LINE"
      )
        .map((block) => block.Text)
        .filter(Boolean);

      if (lines.length === 0) {
        logger.warn("No text lines extracted from image");
        throw new Error(
          "Nenhum texto foi extraído da imagem. Certifique-se de que o texto está claro e legível."
        );
      }

      const extractedText = lines.join("\n");

      logger.info("Text extracted successfully from image", {
        textLength: extractedText.length,
        linesCount: lines.length,
      });

      return extractedText;
    } catch (error) {
      logger.error("Error extracting text from image", error as Error);
      throw error;
    }
  }

  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    logger.info("Extracting text from PDF");

    const data = await pdfParse(pdfBuffer);
    return data.text.trim();
  }

  private async extractTextFromDOCX(docxBuffer: Buffer): Promise<string> {
    logger.info("Extracting text from DOCX");

    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value.trim();
  }
}
