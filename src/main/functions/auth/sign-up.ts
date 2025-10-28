import { APIGatewayProxyHandler } from 'aws-lambda';
import { container } from '../../../kernel/di/container';
import { successResponse, errorResponse, parseBody } from '../../adapters/lambda-adapter';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phoneNumber: z.string().optional(),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = parseBody(event);
    const data = signUpSchema.parse(body);

    const result = await container.authController.signUp(data);

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error as Error);
  }
};
