import { Test, TestingModule } from '@nestjs/testing';
import { WalletRepository } from '@/domain/services/wallet/wallet.repository';
import { DatabaseService } from '@/domain/services/database/database.service';
import { Transaction, TransactionType } from '@/domain/entities/transaction.entity';

describe('WalletRepository', () => {
  let repository: WalletRepository;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockPrismaTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: 'deposit',
    amount: 100,
    referenceTransactionId: null,
    senderId: null,
    senderName: null,
    recipientId: null,
    recipientName: null,
    createdAt: new Date('2024-01-01'),
  };

  const expectedTransaction: Transaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: TransactionType.DEPOSIT,
    amount: 100,
    referenceTransactionId: undefined,
    senderId: undefined,
    senderName: undefined,
    recipientId: undefined,
    recipientName: undefined,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletRepository,
        {
          provide: DatabaseService,
          useValue: {
            transaction: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<WalletRepository>(WalletRepository);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should create a deposit transaction', async () => {
      const createData = { userId: 'user-1', type: TransactionType.DEPOSIT, amount: 100 };
      (databaseService.transaction.create as jest.Mock).mockResolvedValue(mockPrismaTransaction);

      const result = await repository.createTransaction(createData);

      expect(result).toEqual(expectedTransaction);
      expect(databaseService.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: TransactionType.DEPOSIT,
          amount: 100,
          referenceTransactionId: undefined,
          senderId: undefined,
          senderName: undefined,
          recipientId: undefined,
          recipientName: undefined,
        },
      });
    });

    it('should create a transfer transaction with recipient info', async () => {
      const createData = {
        userId: 'user-1',
        type: TransactionType.TRANSFER,
        amount: -100,
        recipientId: 'user-2',
        recipientName: 'Jane Doe',
      };
      const mockTransferTransaction = {
        ...mockPrismaTransaction,
        type: 'transfer',
        amount: -100,
        recipientId: 'user-2',
        recipientName: 'Jane Doe',
      };
      (databaseService.transaction.create as jest.Mock).mockResolvedValue(mockTransferTransaction);

      const result = await repository.createTransaction(createData);

      expect(result.type).toBe(TransactionType.TRANSFER);
      expect(result.recipientId).toBe('user-2');
      expect(result.recipientName).toBe('Jane Doe');
    });

    it('should create a transfer transaction with sender info', async () => {
      const createData = {
        userId: 'user-2',
        type: TransactionType.TRANSFER,
        amount: 100,
        referenceTransactionId: 'tx-1',
        senderId: 'user-1',
        senderName: 'John Doe',
      };
      const mockTransferTransaction = {
        ...mockPrismaTransaction,
        id: 'tx-2',
        userId: 'user-2',
        type: 'transfer',
        amount: 100,
        referenceTransactionId: 'tx-1',
        senderId: 'user-1',
        senderName: 'John Doe',
      };
      (databaseService.transaction.create as jest.Mock).mockResolvedValue(mockTransferTransaction);

      const result = await repository.createTransaction(createData);

      expect(result.senderId).toBe('user-1');
      expect(result.senderName).toBe('John Doe');
      expect(result.referenceTransactionId).toBe('tx-1');
    });
  });

  describe('createTransactionInTransaction', () => {
    it('should create a transaction within a database transaction', async () => {
      const mockTx = { transaction: { create: jest.fn().mockResolvedValue(mockPrismaTransaction) } };
      const createData = { userId: 'user-1', type: TransactionType.DEPOSIT, amount: 100 };

      const result = await repository.createTransactionInTransaction(mockTx as any, createData);

      expect(result).toEqual(expectedTransaction);
      expect(mockTx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: TransactionType.DEPOSIT,
          amount: 100,
          referenceTransactionId: undefined,
          senderId: undefined,
          senderName: undefined,
          recipientId: undefined,
          recipientName: undefined,
        },
      });
    });
  });

  describe('findTransactionById', () => {
    it('should return transaction when found', async () => {
      (databaseService.transaction.findUnique as jest.Mock).mockResolvedValue(mockPrismaTransaction);

      const result = await repository.findTransactionById('tx-1');

      expect(result).toEqual(expectedTransaction);
      expect(databaseService.transaction.findUnique).toHaveBeenCalledWith({ where: { id: 'tx-1' } });
    });

    it('should return null when transaction not found', async () => {
      (databaseService.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findTransactionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findTransactionByReferenceId', () => {
    it('should return reversal transaction when found', async () => {
      const mockReversalTransaction = {
        ...mockPrismaTransaction,
        id: 'tx-reversal',
        type: 'reversal',
        amount: -100,
        referenceTransactionId: 'tx-1',
      };
      (databaseService.transaction.findFirst as jest.Mock).mockResolvedValue(mockReversalTransaction);

      const result = await repository.findTransactionByReferenceId('tx-1');

      expect(result).not.toBeNull();
      expect(result?.type).toBe(TransactionType.REVERSAL);
      expect(databaseService.transaction.findFirst).toHaveBeenCalledWith({
        where: { referenceTransactionId: 'tx-1', type: TransactionType.REVERSAL },
      });
    });

    it('should return null when no reversal found', async () => {
      (databaseService.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findTransactionByReferenceId('tx-1');

      expect(result).toBeNull();
    });
  });

  describe('findTransactionsByUserId', () => {
    it('should return transactions with pagination', async () => {
      (databaseService.transaction.findMany as jest.Mock).mockResolvedValue([mockPrismaTransaction]);
      (databaseService.transaction.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.findTransactionsByUserId('user-1', 1, 10);

      expect(result).toEqual({ transactions: [expectedTransaction], total: 1 });
      expect(databaseService.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(databaseService.transaction.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('should calculate skip correctly for page 2', async () => {
      (databaseService.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (databaseService.transaction.count as jest.Mock).mockResolvedValue(0);

      await repository.findTransactionsByUserId('user-1', 2, 10);

      expect(databaseService.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });

    it('should handle empty results', async () => {
      (databaseService.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (databaseService.transaction.count as jest.Mock).mockResolvedValue(0);

      const result = await repository.findTransactionsByUserId('user-1', 1, 10);

      expect(result).toEqual({ transactions: [], total: 0 });
    });
  });

  describe('calculateBalance', () => {
    it('should return sum of all transactions', async () => {
      (databaseService.transaction.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 1500 } });

      const result = await repository.calculateBalance('user-1');

      expect(result).toBe(1500);
      expect(databaseService.transaction.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        _sum: { amount: true },
      });
    });

    it('should return 0 when no transactions exist', async () => {
      (databaseService.transaction.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });

      const result = await repository.calculateBalance('user-1');

      expect(result).toBe(0);
    });

    it('should handle Decimal type conversion', async () => {
      (databaseService.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: { toNumber: () => 1500.5 } },
      });

      const result = await repository.calculateBalance('user-1');

      expect(typeof result).toBe('number');
    });
  });
});
