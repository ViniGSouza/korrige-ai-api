import { Essay, CreateEssayDTO, UpdateEssayDTO, EssayStatus } from '../entities/Essay';

export interface ListEssaysParams {
  userId: string;
  status?: EssayStatus;
  limit?: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface ListEssaysResult {
  items: Essay[];
  lastEvaluatedKey?: Record<string, unknown>;
  count: number;
}

export interface IEssayRepository {
  create(data: CreateEssayDTO & { essayId: string }): Promise<Essay>;
  findById(essayId: string, userId: string): Promise<Essay | null>;
  findByUserId(params: ListEssaysParams): Promise<ListEssaysResult>;
  update(essayId: string, userId: string, data: UpdateEssayDTO): Promise<Essay>;
  delete(essayId: string, userId: string): Promise<void>;
}
