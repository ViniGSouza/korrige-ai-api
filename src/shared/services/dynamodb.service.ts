import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../../config/index.js';

const client = new DynamoDBClient({ region: config.aws.region });

export const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

export class DynamoDBService {
  constructor(private tableName: string = config.dynamodb.tableName) {}

  async get<T>(PK: string, SK: string): Promise<T | null> {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK, SK },
      })
    );

    return (result.Item as T) || null;
  }

  async put<T extends Record<string, unknown>>(item: T): Promise<T> {
    await dynamoDb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return item;
  }

  async update<T>(
    PK: string,
    SK: string,
    updates: Record<string, unknown>
  ): Promise<T> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      updateExpressions.push(`#field${index} = :value${index}`);
      expressionAttributeNames[`#field${index}`] = key;
      expressionAttributeValues[`:value${index}`] = value;
    });

    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK, SK },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as T;
  }

  async delete(PK: string, SK: string): Promise<void> {
    await dynamoDb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK, SK },
      })
    );
  }

  async query<T>(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, unknown>,
    indexName?: string,
    expressionAttributeNames?: Record<string, string>
  ): Promise<T[]> {
    const result = await dynamoDb.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      })
    );

    return (result.Items as T[]) || [];
  }

  async scan<T>(): Promise<T[]> {
    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    return (result.Items as T[]) || [];
  }
}
