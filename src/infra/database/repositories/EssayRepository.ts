import { IEssayRepository, ListEssaysParams, ListEssaysResult } from '../../../application/contracts';
import { Essay, CreateEssayDTO, UpdateEssayDTO } from '../../../application/entities';
import { DynamoDBService } from '../dynamodb/DynamoDBRepository';

export class EssayRepository implements IEssayRepository {
  constructor(private readonly dynamodb: DynamoDBService) {}

  async create(data: CreateEssayDTO & { essayId: string }): Promise<Essay> {
    const { essayId, userId, title, content, fileKey, fileType, aiProvider } = data;
    const now = new Date().toISOString();

    const essay: Essay = {
      PK: `USER#${userId}`,
      SK: `ESSAY#${essayId}`,
      GSI1PK: `ESSAY#STATUS#pending`,
      GSI1SK: `ESSAY#${now}`,
      GSI2PK: `ESSAY#USER#${userId}`,
      GSI2SK: `ESSAY#${now}`,
      essayId,
      userId,
      title,
      content,
      fileKey,
      fileType,
      status: 'pending',
      aiProvider,
      createdAt: now,
      updatedAt: now,
      type: 'ESSAY',
    };

    return this.dynamodb.put(essay);
  }

  async findById(essayId: string, userId: string): Promise<Essay | null> {
    return this.dynamodb.get<Essay>(`USER#${userId}`, `ESSAY#${essayId}`);
  }

  async findByUserId(params: ListEssaysParams): Promise<ListEssaysResult> {
    const { userId, status, limit = 20, lastEvaluatedKey } = params;

    if (status) {
      return this.dynamodb.query<Essay>({
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': `ESSAY#STATUS#${status}`,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
    }

    return this.dynamodb.query<Essay>({
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk',
      ExpressionAttributeValues: {
        ':gsi2pk': `ESSAY#USER#${userId}`,
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: false,
    });
  }

  async update(essayId: string, userId: string, data: UpdateEssayDTO): Promise<Essay> {
    const updates: Record<string, any> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (data.status) {
      updates['GSI1PK'] = `ESSAY#STATUS#${data.status}`;
    }

    return this.dynamodb.update<Essay>(`USER#${userId}`, `ESSAY#${essayId}`, updates);
  }

  async delete(essayId: string, userId: string): Promise<void> {
    await this.dynamodb.delete(`USER#${userId}`, `ESSAY#${essayId}`);
  }
}
