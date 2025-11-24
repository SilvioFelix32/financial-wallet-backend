import { User } from '@/domain/entities/user.entity';

export const USERS_REPOSITORY_TOKEN = Symbol('IUsersRepository');

export interface IUsersRepository {
  create(data: { user_id: string; name: string; email: string }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByUserId(user_id: string): Promise<User | null>;
  findAll(page: number, limit: number): Promise<{ users: User[]; total: number }>;
  updateBalance(userId: string, newBalance: number): Promise<void>;
  updateBalanceInTransaction(tx: any, userId: string, newBalance: number): Promise<void>;
}

