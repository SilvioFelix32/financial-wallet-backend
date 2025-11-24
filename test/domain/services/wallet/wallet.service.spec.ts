import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WalletService } from '@/domain/services/wallet/wallet.service';
import { IWalletRepository, WALLET_REPOSITORY_TOKEN } from '@/domain/services/wallet/wallet.repository.interface';
import { IUsersRepository, USERS_REPOSITORY_TOKEN } from '@/domain/services/users/users.repository.interface';
import { DatabaseService } from '@/domain/services/database/database.service';
import { TransactionType } from '@/domain/entities/transaction.entity';
import { DepositDto } from '@/application/dtos/wallet/deposit.dto';
import { TransferDto } from '@/application/dtos/wallet/transfer.dto';
import { RevertDto } from '@/application/dtos/wallet/revert.dto';
import { TransactionsQueryDto } from '@/application/dtos/wallet/transactions-query.dto';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: jest.Mocked<IWalletRepository>;
  let usersRepository: jest.Mocked<IUsersRepository>;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockUser = {
    user_id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    balance: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: TransactionType.DEPOSIT,
    amount: 100,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockWalletRepository = {
      createTransaction: jest.fn(),
      createTransactionInTransaction: jest.fn(),
      findTransactionById: jest.fn(),
      findTransactionByReferenceId: jest.fn(),
      findTransactionsByUserId: jest.fn(),
      calculateBalance: jest.fn(),
    };

    const mockUsersRepository = {
      create: jest.fn(),
      updateBalance: jest.fn(),
      updateBalanceInTransaction: jest.fn(),
      findByEmail: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
    };

    const mockDatabaseService = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WALLET_REPOSITORY_TOKEN,
          useValue: mockWalletRepository,
        },
        {
          provide: USERS_REPOSITORY_TOKEN,
          useValue: mockUsersRepository,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get(WALLET_REPOSITORY_TOKEN);
    usersRepository = module.get(USERS_REPOSITORY_TOKEN);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    const depositDto: DepositDto = { amount: 100 };

    it('should deposit successfully when balance is positive', async () => {
      const mockTx = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: 1000,
            })
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: 1100,
            }),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.createTransactionInTransaction.mockResolvedValue(mockTransaction);
      usersRepository.updateBalanceInTransaction.mockResolvedValue(undefined);

      const result = await service.deposit('user-1', depositDto);

      expect(result).toEqual({
        message: 'Deposit successful',
        balance: 1100,
      });
      expect(walletRepository.createTransactionInTransaction).toHaveBeenCalledWith(mockTx, {
        userId: 'user-1',
        type: TransactionType.DEPOSIT,
        amount: 100,
      });
      expect(usersRepository.updateBalanceInTransaction).toHaveBeenCalledWith(
        mockTx,
        'user-1',
        1100,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const mockTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(service.deposit('non-existent', depositDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deposit('non-existent', depositDto)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle negative balance correction when deposit amount <= correction', async () => {
      const mockTx = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: -50,
            })
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: 0,
            }),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.createTransactionInTransaction.mockResolvedValue(mockTransaction);
      usersRepository.updateBalanceInTransaction.mockResolvedValue(undefined);

      const result = await service.deposit('user-1', { amount: 50 });

      expect(walletRepository.createTransactionInTransaction).toHaveBeenCalledTimes(1);
      expect(usersRepository.updateBalanceInTransaction).toHaveBeenCalledWith(
        mockTx,
        'user-1',
        0,
      );
      expect(result.balance).toBe(0);
    });

    it('should handle negative balance correction when deposit amount > correction', async () => {
      const mockTx = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: -50,
            })
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: 100,
            }),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.createTransactionInTransaction.mockResolvedValue(mockTransaction);
      usersRepository.updateBalanceInTransaction.mockResolvedValue(undefined);

      const result = await service.deposit('user-1', { amount: 150 });

      expect(walletRepository.createTransactionInTransaction).toHaveBeenCalledTimes(2);
      expect(usersRepository.updateBalanceInTransaction).toHaveBeenCalledWith(
        mockTx,
        'user-1',
        100,
      );
      expect(result.balance).toBe(100);
    });
  });

  describe('transfer', () => {
    const transferDto: TransferDto = {
      toUserId: 'user-2',
      amount: 100,
    };

    it('should transfer successfully', async () => {
      const mockTx = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              user_id: 'user-1',
              name: 'John Doe',
              balance: 1000,
            })
            .mockResolvedValueOnce({
              user_id: 'user-2',
              name: 'Jane Doe',
              balance: 500,
            })
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: 900,
            }),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.createTransactionInTransaction
        .mockResolvedValueOnce({
          ...mockTransaction,
          id: 'tx-from',
        })
        .mockResolvedValueOnce({
          ...mockTransaction,
          id: 'tx-to',
        });

      usersRepository.updateBalanceInTransaction.mockResolvedValue(undefined);

      const result = await service.transfer('user-1', transferDto);

      expect(result).toEqual({
        message: 'Transfer successful',
        balance: 900,
      });
      expect(walletRepository.createTransactionInTransaction).toHaveBeenCalledTimes(2);
      expect(walletRepository.createTransactionInTransaction).toHaveBeenNthCalledWith(1, mockTx, {
        userId: 'user-1',
        type: TransactionType.TRANSFER,
        amount: -100,
      });
      expect(walletRepository.createTransactionInTransaction).toHaveBeenNthCalledWith(2, mockTx, {
        userId: 'user-2',
        type: TransactionType.TRANSFER,
        amount: 100,
        referenceTransactionId: 'tx-from',
        senderId: 'user-1',
        senderName: 'John Doe',
      });
      expect(usersRepository.updateBalanceInTransaction).toHaveBeenCalledWith(
        mockTx,
        'user-1',
        900,
      );
      expect(usersRepository.updateBalanceInTransaction).toHaveBeenCalledWith(
        mockTx,
        'user-2',
        600,
      );
    });

    it('should throw BadRequestException when transferring to yourself', async () => {
      await expect(
        service.transfer('user-1', { toUserId: 'user-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.transfer('user-1', { toUserId: 'user-1', amount: 100 }),
      ).rejects.toThrow('Cannot transfer to yourself');
    });

    it('should throw NotFoundException when sender does not exist', async () => {
      const mockTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(service.transfer('non-existent', transferDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.transfer('non-existent', transferDto)).rejects.toThrow(
        'Sender user not found',
      );
    });

    it('should throw NotFoundException when recipient does not exist', async () => {
      const findUniqueMock = jest
        .fn()
        .mockResolvedValueOnce({
          user_id: 'user-1',
          name: 'John Doe',
          balance: 1000,
        })
        .mockResolvedValueOnce(null);

      const mockTx = {
        user: {
          findUnique: findUniqueMock,
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(service.transfer('user-1', transferDto)).rejects.toThrow(
        new NotFoundException('Recipient user not found'),
      );
    });

    it('should throw UnprocessableEntityException when insufficient balance', async () => {
      const findUniqueMock = jest
        .fn()
        .mockResolvedValueOnce({
          user_id: 'user-1',
          name: 'John Doe',
          balance: 50,
        })
        .mockResolvedValueOnce({
          user_id: 'user-2',
          name: 'Jane Doe',
          balance: 500,
        });

      const mockTx = {
        user: {
          findUnique: findUniqueMock,
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(service.transfer('user-1', transferDto)).rejects.toThrow(
        new UnprocessableEntityException(
          'Insufficient balance. Current balance: 50, required: 100',
        ),
      );
    });
  });

  describe('revert', () => {
    const revertDto: RevertDto = { transactionId: 'tx-1' };

    it('should revert deposit successfully', async () => {
      const originalTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: TransactionType.DEPOSIT,
        amount: 100,
      };

      const mockTx = {
        transaction: {
          findUnique: jest.fn().mockResolvedValue(originalTransaction),
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: 1000,
            })
            .mockResolvedValueOnce({
              user_id: 'user-1',
              balance: 900,
            }),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.findTransactionByReferenceId.mockResolvedValue(null);
      walletRepository.createTransactionInTransaction.mockResolvedValue(mockTransaction);
      usersRepository.updateBalanceInTransaction.mockResolvedValue(undefined);

      const result = await service.revert('user-1', revertDto);

      expect(result).toEqual({
        message: 'Transaction reverted successfully',
        balance: 900,
      });
      expect(walletRepository.createTransactionInTransaction).toHaveBeenCalledWith(mockTx, {
        userId: 'user-1',
        type: TransactionType.REVERSAL,
        amount: -100,
        referenceTransactionId: 'tx-1',
      });
      expect(usersRepository.updateBalanceInTransaction).toHaveBeenCalledWith(
        mockTx,
        'user-1',
        900,
      );
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      const mockTx = {
        transaction: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(service.revert('user-1', revertDto)).rejects.toThrow(NotFoundException);
      await expect(service.revert('user-1', revertDto)).rejects.toThrow('Transaction not found');
    });

    it('should throw UnauthorizedException when trying to revert another user transaction', async () => {
      const originalTransaction = {
        id: 'tx-1',
        userId: 'user-2',
        type: TransactionType.DEPOSIT,
        amount: 100,
      };

      const mockTx = {
        transaction: {
          findUnique: jest.fn().mockResolvedValue(originalTransaction),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(service.revert('user-1', revertDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.revert('user-1', revertDto)).rejects.toThrow(
        'Cannot revert transaction from another user',
      );
    });

    it('should throw BadRequestException when transaction already reverted', async () => {
      const originalTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: TransactionType.DEPOSIT,
        amount: 100,
      };

      const mockTx = {
        transaction: {
          findUnique: jest.fn().mockResolvedValue(originalTransaction),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.findTransactionByReferenceId.mockResolvedValue({
        ...mockTransaction,
        id: 'reversal-tx',
      });

      await expect(service.revert('user-1', revertDto)).rejects.toThrow(BadRequestException);
      await expect(service.revert('user-1', revertDto)).rejects.toThrow(
        'Transaction already reverted',
      );
    });

    it('should throw BadRequestException when trying to revert a reversal', async () => {
      const originalTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: TransactionType.REVERSAL,
        amount: -100,
      };

      const mockTx = {
        transaction: {
          findUnique: jest.fn().mockResolvedValue(originalTransaction),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.findTransactionByReferenceId.mockResolvedValue(null);

      await expect(service.revert('user-1', revertDto)).rejects.toThrow(BadRequestException);
      await expect(service.revert('user-1', revertDto)).rejects.toThrow(
        'Cannot revert a reversal transaction',
      );
    });

    it('should throw UnprocessableEntityException when insufficient balance to revert deposit', async () => {
      const originalTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: TransactionType.DEPOSIT,
        amount: 100,
      };

      const mockTx = {
        transaction: {
          findUnique: jest.fn().mockResolvedValue(originalTransaction),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            user_id: 'user-1',
            balance: 50,
          }),
        },
      };

      databaseService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      walletRepository.findTransactionByReferenceId.mockResolvedValue(null);

      await expect(service.revert('user-1', revertDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.revert('user-1', revertDto)).rejects.toThrow(
        'Insufficient balance to revert deposit',
      );
    });
  });

  describe('getBalance', () => {
    it('should return user balance', async () => {
      usersRepository.findByUserId.mockResolvedValue(mockUser);

      const result = await service.getBalance('user-1');

      expect(result).toEqual({ balance: 1000 });
      expect(usersRepository.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getBalance('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getBalance('non-existent')).rejects.toThrow('User not found');
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with pagination', async () => {
      const transactions = [
        { ...mockTransaction, id: 'tx-1' },
        { ...mockTransaction, id: 'tx-2' },
      ];

      walletRepository.findTransactionsByUserId.mockResolvedValue({
        transactions,
        total: 2,
      });

      const query: TransactionsQueryDto = { page: 1, limit: 10 };
      const result = await service.getTransactions('user-1', query);

      expect(result).toEqual({
        transactions,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
      expect(walletRepository.findTransactionsByUserId).toHaveBeenCalledWith(
        'user-1',
        1,
        10,
      );
    });

    it('should use default pagination values when not provided', async () => {
      walletRepository.findTransactionsByUserId.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const result = await service.getTransactions('user-1', {});

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
      expect(walletRepository.findTransactionsByUserId).toHaveBeenCalledWith(
        'user-1',
        1,
        10,
      );
    });

    it('should calculate totalPages correctly', async () => {
      walletRepository.findTransactionsByUserId.mockResolvedValue({
        transactions: [],
        total: 25,
      });

      const query: TransactionsQueryDto = { page: 1, limit: 10 };
      const result = await service.getTransactions('user-1', query);

      expect(result.pagination.totalPages).toBe(3);
    });
  });
});

