import { User, CreateUserDTO, UpdateUserDTO } from '../entities/User';

export interface IUserRepository {
  create(data: CreateUserDTO & { userId: string }): Promise<User>;
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(userId: string, data: UpdateUserDTO): Promise<User>;
  delete(userId: string): Promise<void>;
}
