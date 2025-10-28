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

export class FileProcessorProvider implements IFileProcessor {
  private textractClient: TextractClient;

  constructor(private readonly storageProvider: IStorageProvider) {
    this.textractClient = new TextractClient({ region: config.aws.region });
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
    logger.info("Extracting text from image using Textract");

    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBuffer,
      },
    });

    const response = await this.textractClient.send(command);

    if (!response.Blocks) {
      return "";
    }

    // Extract only LINE blocks to get organized text
    const lines = response.Blocks.filter((block) => block.BlockType === "LINE")
      .map((block) => block.Text)
      .filter(Boolean);

    return lines.join("\n");
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
