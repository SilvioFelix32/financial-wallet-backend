import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '@/domain/services/users/users.service';
import { IUsersRepository, USERS_REPOSITORY_TOKEN } from '@/domain/services/users/users.repository.interface';
import { User } from '@/domain/entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<IUsersRepository>;

  const mockUser: User = {
    user_id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    balance: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USERS_REPOSITORY_TOKEN,
          useValue: {
            create: jest.fn(),
            updateBalance: jest.fn(),
            updateBalanceInTransaction: jest.fn(),
            findByEmail: jest.fn(),
            findByUserId: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(USERS_REPOSITORY_TOKEN);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createData = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      usersRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(createData);

      expect(result).toEqual(mockUser);
      expect(usersRepository.create).toHaveBeenCalledWith(createData);
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john@example.com');

      expect(result).toEqual(mockUser);
      expect(usersRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(usersRepository.findByEmail).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(usersRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });
  });

  describe('findByUserId', () => {
    it('should return user when found', async () => {
      usersRepository.findByUserId.mockResolvedValue(mockUser);

      const result = await service.findByUserId('user-1');

      expect(result).toEqual(mockUser);
      expect(usersRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(usersRepository.findByUserId).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found', async () => {
      usersRepository.findByUserId.mockResolvedValue(null);

      const result = await service.findByUserId('non-existent');

      expect(result).toBeNull();
      expect(usersRepository.findByUserId).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('findOrCreate', () => {
    it('should return existing user when found', async () => {
      const createData = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      usersRepository.findByUserId.mockResolvedValue(mockUser);

      const result = await service.findOrCreate(createData);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it('should create new user when not found', async () => {
      const createData = { user_id: 'user-2', name: 'Jane Doe', email: 'jane@example.com' };
      const newUser: User = { ...mockUser, user_id: 'user-2', name: 'Jane Doe', email: 'jane@example.com' };
      usersRepository.findByUserId.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(newUser);

      const result = await service.findOrCreate(createData);

      expect(result).toEqual(newUser);
      expect(usersRepository.findByUserId).toHaveBeenCalledWith('user-2');
      expect(usersRepository.create).toHaveBeenCalledWith(createData);
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return users with pagination', async () => {
      usersRepository.findAll.mockResolvedValue({ users: [mockUser], total: 1 });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        users: [mockUser],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
      expect(usersRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(usersRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should calculate totalPages correctly', async () => {
      usersRepository.findAll.mockResolvedValue({ users: [mockUser], total: 25 });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.total).toBe(25);
    });

    it('should handle empty results', async () => {
      usersRepository.findAll.mockResolvedValue({ users: [], total: 0 });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    });

    it('should use default pagination values when not provided', async () => {
      usersRepository.findAll.mockResolvedValue({ users: [], total: 0 });

      const result = await service.findAll({});

      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
      expect(usersRepository.findAll).toHaveBeenCalledWith(1, 10);
    });
  });
});
