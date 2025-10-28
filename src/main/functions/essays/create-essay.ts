import { APIGatewayProxyHandler } from 'aws-lambda';
import { container } from '../../../kernel/di/container';
import { successResponse, errorResponse, parseBody, getUserIdFromEvent } from '../../adapters/lambda-adapter';
import { z } from 'zod';

const createEssaySchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  content: z.string().optional(),
  fileKey: z.string().optional(),
  fileType: z.enum(['image', 'pdf', 'docx', 'text']).optional(),
  aiProvider: z.enum(['claude', 'openai']).default('claude'),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserIdFromEvent(event);
    const body = parseBody(event);
    const data = createEssaySchema.parse(body);

    const result = await container.essaysController.createEssay({
      userId,
      ...data,
    });

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error as Error);
  }
};
