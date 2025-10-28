import { IUserRepository } from "../../../application/contracts";
import {
  CreateUserDTO,
  UpdateUserDTO,
  User,
} from "../../../application/entities";
import { DynamoDBService } from "../dynamodb/DynamoDBRepository";

export class UserRepository implements IUserRepository {
  constructor(private readonly dynamodb: DynamoDBService) {}

  async create(data: CreateUserDTO & { userId: string }): Promise<User> {
    const { userId, email, name, phoneNumber } = data;
    const now = new Date().toISOString();

    const user: User = {
      PK: `USER#${userId}`,
      SK: `USER#${userId}`,
      GSI1PK: `USER#EMAIL#${email}`,
      GSI1SK: `USER#EMAIL#${email}`,
      userId,
      email,
      name,
      phoneNumber,
      createdAt: now,
      updatedAt: now,
      type: "USER",
    };

    return this.dynamodb.put(user);
  }

  async findById(userId: string): Promise<User | null> {
    return this.dynamodb.get<User>(`USER#${userId}`, `USER#${userId}`);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.dynamodb.query<User>({
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": `USER#EMAIL#${email}`,
      },
      Limit: 1,
    });

    return result.items[0] || null;
  }

  async update(userId: string, data: UpdateUserDTO): Promise<User> {
    const updates = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return this.dynamodb.update<User>(
      `USER#${userId}`,
      `USER#${userId}`,
      updates
    );
  }

  async delete(userId: string): Promise<void> {
    await this.dynamodb.delete(`USER#${userId}`, `USER#${userId}`);
  }
}
