import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from '@/infrastructure/http/controllers/users/users.controller';
import { UsersService } from '@/domain/services/users/users.service';
import { CognitoAuthGuard } from '@/infrastructure/security/auth/guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    user_id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    balance: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findOrCreate: jest.fn(),
            findAll: jest.fn(),
            findByEmail: jest.fn(),
            findByUserId: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      usersService.findOrCreate.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(usersService.findOrCreate).toHaveBeenCalledWith(createUserDto);
      expect(usersService.findOrCreate).toHaveBeenCalledTimes(1);
    });

    it('should return existing user if already exists', async () => {
      const createUserDto = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      usersService.findOrCreate.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(usersService.findOrCreate).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return users with pagination', async () => {
      const query = { page: 1, limit: 10 };
      const paginatedResult = {
        users: [mockUser],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      usersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(paginatedResult);
      expect(usersService.findAll).toHaveBeenCalledWith(query);
      expect(usersService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle empty query params', async () => {
      const paginatedResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      usersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(usersService.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await controller.findByEmail('john@example.com');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(usersService.findByEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user not found by email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(controller.findByEmail('nonexistent@example.com')).rejects.toThrow(NotFoundException);
      await expect(controller.findByEmail('nonexistent@example.com')).rejects.toThrow('User not found');
    });
  });

  describe('findById', () => {
    it('should return user when found by user_id', async () => {
      usersService.findByUserId.mockResolvedValue(mockUser);

      const result = await controller.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(usersService.findByUserId).toHaveBeenCalledWith('user-1');
      expect(usersService.findByUserId).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user not found by user_id', async () => {
      usersService.findByUserId.mockResolvedValue(null);

      await expect(controller.findById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(controller.findById('non-existent')).rejects.toThrow('User not found');
    });
  });
});
