import { Transaction, TransactionType } from '@/domain/entities/transaction.entity';

export const WALLET_REPOSITORY_TOKEN = Symbol('IWalletRepository');

export interface IWalletRepository {
  createTransaction(data: {
    userId: string;
    type: TransactionType;
    amount: number;
    referenceTransactionId?: string;
    senderId?: string;
    senderName?: string;
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
    tx: any,
    data: {
      userId: string;
      type: TransactionType;
      amount: number;
      referenceTransactionId?: string;
      senderId?: string;
      senderName?: string;
    },
  ): Promise<Transaction>;
}

