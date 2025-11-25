import { Injectable } from '@nestjs/common';
import { Transaction, TransactionType } from '@/domain/entities/transaction.entity';
import { IWalletRepository, PrismaTransaction } from './wallet.repository.interface';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletRepository implements IWalletRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createTransaction(data: {
    userId: string;
    type: TransactionType;
    amount: number;
    referenceTransactionId?: string;
    senderId?: string;
    senderName?: string;
    recipientId?: string;
    recipientName?: string;
  }): Promise<Transaction> {
    const result = await this.databaseService.transaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        referenceTransactionId: data.referenceTransactionId,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
      },
    });
    return this.mapToTransaction(result);
  }

  async createTransactionInTransaction(
    tx: PrismaTransaction,
    data: {
      userId: string;
      type: TransactionType;
      amount: number;
      referenceTransactionId?: string;
      senderId?: string;
      senderName?: string;
      recipientId?: string;
      recipientName?: string;
    },
  ): Promise<Transaction> {
    const result = await tx.transaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        referenceTransactionId: data.referenceTransactionId,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
      },
    });
    return this.mapToTransaction(result);
  }

  async findTransactionById(id: string): Promise<Transaction | null> {
    const result = await this.databaseService.transaction.findUnique({
      where: { id },
    });
    return result ? this.mapToTransaction(result) : null;
  }

  async findTransactionByReferenceId(
    referenceTransactionId: string,
  ): Promise<Transaction | null> {
    const result = await this.databaseService.transaction.findFirst({
      where: { referenceTransactionId },
    });
    return result ? this.mapToTransaction(result) : null;
  }

  async findTransactionsByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.databaseService.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.databaseService.transaction.count({
        where: { userId },
      }),
    ]);

    return {
      transactions: transactions.map((t: Prisma.TransactionGetPayload<{}>) =>
        this.mapToTransaction(t),
      ),
      total,
    };
  }

  async calculateBalance(userId: string): Promise<number> {
    const result = await this.databaseService.transaction.aggregate({
      where: { userId },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }

  private mapToTransaction(prismaTransaction: Prisma.TransactionGetPayload<{}>): Transaction {
    return {
      id: prismaTransaction.id,
      userId: prismaTransaction.userId,
      type: prismaTransaction.type as TransactionType,
      amount: Number(prismaTransaction.amount),
      referenceTransactionId: prismaTransaction.referenceTransactionId || undefined,
      senderId: prismaTransaction.senderId || undefined,
      senderName: prismaTransaction.senderName || undefined,
      recipientId: prismaTransaction.recipientId || undefined,
      recipientName: prismaTransaction.recipientName || undefined,
      createdAt: prismaTransaction.createdAt,
    };
  }
}

