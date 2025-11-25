import { User } from '@/domain/entities/user.entity';
import { PrismaClient } from '@prisma/client';

export const USERS_REPOSITORY_TOKEN = Symbol('IUsersRepository');

export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface IUsersRepository {
  create(data: { user_id: string; name: string; email: string }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByUserId(user_id: string): Promise<User | null>;
  findAll(page: number, limit: number): Promise<{ users: User[]; total: number }>;
  updateBalance(userId: string, newBalance: number): Promise<void>;
  updateBalanceInTransaction(tx: PrismaTransaction, userId: string, newBalance: number): Promise<void>;
}

