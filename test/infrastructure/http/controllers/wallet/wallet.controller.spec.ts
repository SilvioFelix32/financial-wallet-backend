import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from '@/infrastructure/http/controllers/wallet/wallet.controller';
import { WalletService } from '@/domain/services/wallet/wallet.service';
import { CognitoAuthGuard } from '@/infrastructure/security/auth/guards/jwt-auth.guard';
import { TransactionType } from '@/domain/entities/transaction.entity';

describe('WalletController', () => {
  let controller: WalletController;
  let walletService: jest.Mocked<WalletService>;

  const mockTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: TransactionType.DEPOSIT,
    amount: 100,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: {
            deposit: jest.fn(),
            transfer: jest.fn(),
            revert: jest.fn(),
            getBalance: jest.fn(),
            getTransactions: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletController>(WalletController);
    walletService = module.get(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    it('should deposit money successfully', async () => {
      const depositDto = { amount: 100 };
      const expectedResult = { message: 'Deposit successful', balance: 1100 };
      walletService.deposit.mockResolvedValue(expectedResult);

      const result = await controller.deposit('user-1', depositDto);

      expect(result).toEqual(expectedResult);
      expect(walletService.deposit).toHaveBeenCalledWith('user-1', depositDto);
      expect(walletService.deposit).toHaveBeenCalledTimes(1);
    });

    it('should handle deposit with different amounts', async () => {
      const depositDto = { amount: 500 };
      const expectedResult = { message: 'Deposit successful', balance: 1500 };
      walletService.deposit.mockResolvedValue(expectedResult);

      const result = await controller.deposit('user-2', depositDto);

      expect(result).toEqual(expectedResult);
      expect(walletService.deposit).toHaveBeenCalledWith('user-2', depositDto);
    });
  });

  describe('transfer', () => {
    it('should transfer money successfully', async () => {
      const transferDto = { toUserId: 'user-2', amount: 100 };
      const expectedResult = { message: 'Transfer successful', balance: 900 };
      walletService.transfer.mockResolvedValue(expectedResult);

      const result = await controller.transfer('user-1', transferDto);

      expect(result).toEqual(expectedResult);
      expect(walletService.transfer).toHaveBeenCalledWith('user-1', transferDto);
      expect(walletService.transfer).toHaveBeenCalledTimes(1);
    });

    it('should handle transfer with different amounts', async () => {
      const transferDto = { toUserId: 'user-3', amount: 250 };
      const expectedResult = { message: 'Transfer successful', balance: 750 };
      walletService.transfer.mockResolvedValue(expectedResult);

      const result = await controller.transfer('user-1', transferDto);

      expect(result).toEqual(expectedResult);
      expect(walletService.transfer).toHaveBeenCalledWith('user-1', transferDto);
    });
  });

  describe('revert', () => {
    it('should revert transaction successfully', async () => {
      const revertDto = { transactionId: 'tx-1' };
      const expectedResult = { message: 'Transaction reverted successfully', balance: 1000 };
      walletService.revert.mockResolvedValue(expectedResult);

      const result = await controller.revert('user-1', revertDto);

      expect(result).toEqual(expectedResult);
      expect(walletService.revert).toHaveBeenCalledWith('user-1', revertDto);
      expect(walletService.revert).toHaveBeenCalledTimes(1);
    });

    it('should handle revert with different transaction ids', async () => {
      const revertDto = { transactionId: 'tx-2' };
      const expectedResult = { message: 'Transaction reverted successfully', balance: 500 };
      walletService.revert.mockResolvedValue(expectedResult);

      const result = await controller.revert('user-2', revertDto);

      expect(result).toEqual(expectedResult);
      expect(walletService.revert).toHaveBeenCalledWith('user-2', revertDto);
    });
  });

  describe('getBalance', () => {
    it('should return user balance', async () => {
      const expectedResult = { balance: 1000 };
      walletService.getBalance.mockResolvedValue(expectedResult);

      const result = await controller.getBalance('user-1');

      expect(result).toEqual(expectedResult);
      expect(walletService.getBalance).toHaveBeenCalledWith('user-1');
      expect(walletService.getBalance).toHaveBeenCalledTimes(1);
    });

    it('should handle different users balances', async () => {
      const expectedResult = { balance: 5000 };
      walletService.getBalance.mockResolvedValue(expectedResult);

      const result = await controller.getBalance('user-2');

      expect(result).toEqual(expectedResult);
      expect(walletService.getBalance).toHaveBeenCalledWith('user-2');
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with pagination', async () => {
      const query = { page: 1, limit: 10 };
      const expectedResult = {
        transactions: [mockTransaction],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      walletService.getTransactions.mockResolvedValue(expectedResult);

      const result = await controller.getTransactions('user-1', query);

      expect(result).toEqual(expectedResult);
      expect(walletService.getTransactions).toHaveBeenCalledWith('user-1', query);
      expect(walletService.getTransactions).toHaveBeenCalledTimes(1);
    });

    it('should handle empty query params', async () => {
      const expectedResult = {
        transactions: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      walletService.getTransactions.mockResolvedValue(expectedResult);

      const result = await controller.getTransactions('user-1', {});

      expect(result).toEqual(expectedResult);
      expect(walletService.getTransactions).toHaveBeenCalledWith('user-1', {});
    });

    it('should handle custom pagination', async () => {
      const query = { page: 2, limit: 5 };
      const expectedResult = {
        transactions: [mockTransaction],
        pagination: { page: 2, limit: 5, total: 10, totalPages: 2 },
      };
      walletService.getTransactions.mockResolvedValue(expectedResult);

      const result = await controller.getTransactions('user-1', query);

      expect(result).toEqual(expectedResult);
      expect(walletService.getTransactions).toHaveBeenCalledWith('user-1', query);
    });
  });
});
