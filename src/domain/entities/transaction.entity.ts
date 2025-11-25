export enum TransactionType {
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  REVERSAL = 'reversal',
}

export class Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  referenceTransactionId?: string;
  senderId?: string;
  senderName?: string;
  recipientId?: string;
  recipientName?: string;
  createdAt: Date;
}

