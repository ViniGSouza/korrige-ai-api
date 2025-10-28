import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { CognitoService } from "../../shared/services/cognito.service.js";
import { DynamoDBService } from "../../shared/services/dynamodb.service.js";
import { signUpSchema } from "../../shared/schemas/auth.js";
import { successResponse, errorResponse } from "../../shared/utils/response.js";
import { Logger } from "../../shared/utils/logger.js";
import { ValidationError } from "../../shared/errors/index.js";
import type { User } from "../../shared/types/index.js";

const logger = new Logger("SignUp");
const cognitoService = new CognitoService();
const dynamoDbService = new DynamoDBService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info("Iniciando registro de usuário");

    if (!event.body) {
      throw new ValidationError("Request body is required");
    }

    const body = signUpSchema.parse(JSON.parse(event.body));

    const signUpResult = await cognitoService.signUp(
      body.email,
      body.password,
      body.name,
      body.phoneNumber
    );

    logger.info("Usuário registrado no Cognito", {
      userId: signUpResult.userId,
    });

    const now = new Date().toISOString();
    const user: User = {
      PK: `USER#${signUpResult.userId}`,
      SK: `USER#${signUpResult.userId}`,
      GSI1PK: `USER#EMAIL#${body.email}`,
      GSI1SK: `USER#EMAIL#${body.email}`,
      userId: signUpResult.userId,
      email: body.email,
      name: body.name,
      phoneNumber: body.phoneNumber,
      createdAt: now,
      updatedAt: now,
      type: "USER",
    };

    await dynamoDbService.put(user);

    logger.info("Usuário registrado no DynamoDB", {
      userId: signUpResult.userId,
    });

    return successResponse(
      {
        userId: signUpResult.userId,
        email: body.email,
        name: body.name,
        userConfirmed: signUpResult.userConfirmed,
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error", error);
      return errorResponse(error.errors[0].message, 400);
    }

    logger.error("Erro ao registrar usuário", error as Error);
    return errorResponse(error as Error, 500);
  }
};
