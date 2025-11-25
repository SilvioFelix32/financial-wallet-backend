import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '@/domain/services/users/users.repository';
import { DatabaseService } from '@/domain/services/database/database.service';
import { User } from '@/domain/entities/user.entity';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockPrismaUser = {
    user_id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    balance: 1000,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const expectedUser: User = { ...mockPrismaUser };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: DatabaseService,
          useValue: {
            user: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user and return mapped entity', async () => {
      const createData = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      (databaseService.user.create as jest.Mock).mockResolvedValue(mockPrismaUser);

      const result = await repository.create(createData);

      expect(result).toEqual(expectedUser);
      expect(databaseService.user.create).toHaveBeenCalledWith({
        data: { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' },
      });
      expect(databaseService.user.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateBalance', () => {
    it('should update user balance', async () => {
      (databaseService.user.update as jest.Mock).mockResolvedValue(mockPrismaUser);

      await repository.updateBalance('user-1', 2000);

      expect(databaseService.user.update).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        data: { balance: 2000 },
      });
      expect(databaseService.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateBalanceInTransaction', () => {
    it('should update user balance within a transaction', async () => {
      const mockTx = { user: { update: jest.fn().mockResolvedValue(mockPrismaUser) } };

      await repository.updateBalanceInTransaction(mockTx as any, 'user-1', 2000);

      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        data: { balance: 2000 },
      });
      expect(mockTx.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      (databaseService.user.findUnique as jest.Mock).mockResolvedValue(mockPrismaUser);

      const result = await repository.findByEmail('john@example.com');

      expect(result).toEqual(expectedUser);
      expect(databaseService.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
    });

    it('should return null when user not found by email', async () => {
      (databaseService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(databaseService.user.findUnique).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
    });
  });

  describe('findByUserId', () => {
    it('should return user when found by user_id', async () => {
      (databaseService.user.findUnique as jest.Mock).mockResolvedValue(mockPrismaUser);

      const result = await repository.findByUserId('user-1');

      expect(result).toEqual(expectedUser);
      expect(databaseService.user.findUnique).toHaveBeenCalledWith({ where: { user_id: 'user-1' } });
    });

    it('should return null when user not found by user_id', async () => {
      (databaseService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByUserId('non-existent');

      expect(result).toBeNull();
      expect(databaseService.user.findUnique).toHaveBeenCalledWith({ where: { user_id: 'non-existent' } });
    });
  });

  describe('findAll', () => {
    it('should return users with pagination', async () => {
      (databaseService.user.findMany as jest.Mock).mockResolvedValue([mockPrismaUser]);
      (databaseService.user.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.findAll(1, 10);

      expect(result).toEqual({ users: [expectedUser], total: 1 });
      expect(databaseService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(databaseService.user.count).toHaveBeenCalledTimes(1);
    });

    it('should calculate skip correctly for page 2', async () => {
      (databaseService.user.findMany as jest.Mock).mockResolvedValue([]);
      (databaseService.user.count as jest.Mock).mockResolvedValue(0);

      await repository.findAll(2, 10);

      expect(databaseService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });

    it('should calculate skip correctly for page 3 with limit 5', async () => {
      (databaseService.user.findMany as jest.Mock).mockResolvedValue([]);
      (databaseService.user.count as jest.Mock).mockResolvedValue(0);

      await repository.findAll(3, 5);

      expect(databaseService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 5,
      });
    });

    it('should handle empty results', async () => {
      (databaseService.user.findMany as jest.Mock).mockResolvedValue([]);
      (databaseService.user.count as jest.Mock).mockResolvedValue(0);

      const result = await repository.findAll(1, 10);

      expect(result).toEqual({ users: [], total: 0 });
    });

    it('should map balance from Decimal to number', async () => {
      const mockUserWithDecimalBalance = { ...mockPrismaUser, balance: { toNumber: () => 1000.5 } as any };
      (databaseService.user.findMany as jest.Mock).mockResolvedValue([mockUserWithDecimalBalance]);
      (databaseService.user.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.findAll(1, 10);

      expect(typeof result.users[0].balance).toBe('number');
    });
  });
});
