import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import sharp from "sharp";
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
const MAX_IMAGE_DIMENSION = 4096; // pixels

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
      // Processar imagem se necessário
      let processedBuffer = imageBuffer;

      // Se a imagem for muito grande, redimensionar
      if (imageBuffer.length > TEXTRACT_MAX_SIZE) {
        logger.info("Image too large, resizing...", {
          originalSize: imageBuffer.length,
        });
        processedBuffer = await this.resizeImage(imageBuffer);
      }

      // Validar se ainda está dentro do limite
      if (processedBuffer.length > TEXTRACT_MAX_SIZE) {
        throw new Error(
          `Image still too large after resize: ${processedBuffer.length} bytes (max: ${TEXTRACT_MAX_SIZE})`
        );
      }

      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: processedBuffer,
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

  private async resizeImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      logger.info("Resizing image", {
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        format: metadata.format,
      });

      const resized = await sharp(imageBuffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90, mozjpeg: true }) // Converter para JPEG com boa qualidade
        .toBuffer();

      logger.info("Image resized successfully", {
        originalSize: imageBuffer.length,
        newSize: resized.length,
        reduction:
          Math.round(
            ((imageBuffer.length - resized.length) / imageBuffer.length) * 100
          ) + "%",
      });

      return resized;
    } catch (error) {
      logger.error("Error resizing image", error as Error);
      throw new Error("Falha ao redimensionar a imagem");
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
