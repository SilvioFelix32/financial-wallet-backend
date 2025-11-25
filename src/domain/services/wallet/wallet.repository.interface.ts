import { Transaction, TransactionType } from '@/domain/entities/transaction.entity';
import { PrismaClient } from '@prisma/client';

export const WALLET_REPOSITORY_TOKEN = Symbol('IWalletRepository');

export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface IWalletRepository {
  createTransaction(data: {
    userId: string;
    type: TransactionType;
    amount: number;
    referenceTransactionId?: string;
    senderId?: string;
    senderName?: string;
    recipientId?: string;
    recipientName?: string;
  }): Promise<Transaction>;
  findTransactionById(id: string): Promise<Transaction | null>;
  findTransactionsByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ transactions: Transaction[]; total: number }>;
  calculateBalance(userId: string): Promise<number>;
  findTransactionByReferenceId(referenceTransactionId: string): Promise<Transaction | null>;
  createTransactionInTransaction(
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
  ): Promise<Transaction>;
}

