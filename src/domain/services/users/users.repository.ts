import { Injectable } from '@nestjs/common';
import { User } from '@/domain/entities/user.entity';
import { IUsersRepository } from './users.repository.interface';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(data: { user_id: string; name: string; email: string }): Promise<User> {
    const result = await this.databaseService.user.create({
      data: {
        user_id: data.user_id,
        name: data.name,
        email: data.email,
      },
    });
    return this.mapToUser(result);
  }

  async updateBalance(userId: string, newBalance: number): Promise<void> {
    await this.databaseService.user.update({
      where: { user_id: userId },
      data: { balance: newBalance },
    });
  }

  async updateBalanceInTransaction(tx: any, userId: string, newBalance: number): Promise<void> {
    await tx.user.update({
      where: { user_id: userId },
      data: { balance: newBalance },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.databaseService.user.findUnique({
      where: { email },
    });
    return result ? this.mapToUser(result) : null;
  }

  async findByUserId(user_id: string): Promise<User | null> {
    const result = await this.databaseService.user.findUnique({
      where: { user_id },
    });
    return result ? this.mapToUser(result) : null;
  }

  async findAll(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.databaseService.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.databaseService.user.count(),
    ]);

    return {
      users: users.map((u) => this.mapToUser(u)),
      total,
    };
  }

  private mapToUser(prismaUser: any): User {
    return {
      user_id: prismaUser.user_id,
      name: prismaUser.name,
      email: prismaUser.email,
      balance: Number(prismaUser.balance),
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}

