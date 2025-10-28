import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppError } from '../../application/errors';
import { Logger } from '../../shared/utils/logger';

const logger = new Logger('LambdaAdapter');

export function successResponse<T>(data: T, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ success: true, data }),
  };
}

export function errorResponse(error: Error, statusCode = 500): APIGatewayProxyResult {
  logger.error('Lambda error', error);

  const message = error instanceof AppError ? error.message : 'Internal server error';
  const code = error instanceof AppError ? error.statusCode : statusCode;

  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ success: false, message }),
  };
}

export function getUserIdFromEvent(event: APIGatewayProxyEvent): string {
  const userId = event.requestContext.authorizer?.jwt?.claims?.sub as string;
  if (!userId) {
    throw new AppError('User ID not found in token', 401);
  }
  return userId;
}

export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new AppError('Request body is required', 400);
  }
  return JSON.parse(event.body) as T;
}
