import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorHandler } from '@/shared/errors/error-handler';
import { USERS_REPOSITORY_TOKEN } from '@/domain/services/users/users.repository.interface';
import { IS_PUBLIC_KEY } from '@/infrastructure/security/auth/decorators/public.decorator';

const mockDecodeJwt = jest.fn().mockReturnValue({ sub: 'user-123' });

jest.mock('jose', () => ({
  decodeJwt: (token: string) => mockDecodeJwt(token),
  decodeProtectedHeader: jest.fn(),
  jwtVerify: jest.fn(),
  importJWK: jest.fn(),
}));

jest.mock('@/infrastructure/security/auth/strategies/cognito.strategy', () => ({
  CognitoStrategy: jest.fn().mockImplementation(() => ({ validate: jest.fn() })),
}));

import { CognitoAuthGuard } from '@/infrastructure/security/auth/guards/jwt-auth.guard';
import { CognitoStrategy } from '@/infrastructure/security/auth/strategies/cognito.strategy';

describe('CognitoAuthGuard', () => {
  let guard: CognitoAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let cognitoStrategy: jest.Mocked<CognitoStrategy>;
  let usersRepository: jest.Mocked<any>;

  const mockUser = {
    user_id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    balance: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validToken =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsImlhdCI6MTUxNjIzOTAyMn0.signature';

  beforeEach(async () => {
    mockDecodeJwt.mockReturnValue({ sub: 'user-123' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CognitoAuthGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: ErrorHandler, useValue: { handle: jest.fn() } },
        { provide: CognitoStrategy, useValue: { validate: jest.fn() } },
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

    guard = module.get<CognitoAuthGuard>(CognitoAuthGuard);
    reflector = module.get(Reflector);
    errorHandler = module.get(ErrorHandler);
    cognitoStrategy = module.get(CognitoStrategy);
    usersRepository = module.get(USERS_REPOSITORY_TOKEN);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (authorization?: string): ExecutionContext => {
    const mockRequest = {
      headers: { authorization },
      user: undefined as any,
      user_id: undefined as string | undefined,
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('Public routes', () => {
    it('should allow access to public routes without token', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(cognitoStrategy.validate).not.toHaveBeenCalled();
    });
  });

  describe('Protected routes', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockExecutionContext();
      errorHandler.handle.mockReturnValue(
        new UnauthorizedException('JwtAuthGuard.canActivate: Token not found'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Authorization header has wrong format', async () => {
      const context = createMockExecutionContext('Basic invalid-token');
      errorHandler.handle.mockReturnValue(
        new UnauthorizedException('JwtAuthGuard.canActivate: Token not found'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should return false when token is invalid', async () => {
      const context = createMockExecutionContext(`Bearer ${validToken}`);
      cognitoStrategy.validate.mockResolvedValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(cognitoStrategy.validate).toHaveBeenCalledWith(validToken);
    });

    it('should throw UnauthorizedException when user not found in database', async () => {
      const context = createMockExecutionContext(`Bearer ${validToken}`);
      cognitoStrategy.validate.mockResolvedValue(true);
      usersRepository.findByUserId.mockResolvedValue(null);
      errorHandler.handle.mockReturnValue(
        new UnauthorizedException('JwtAuthGuard.canActivate: User not found in database'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(usersRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should allow access and set user data when token is valid and user exists', async () => {
      const context = createMockExecutionContext(`Bearer ${validToken}`);
      const mockRequest = context.switchToHttp().getRequest();
      cognitoStrategy.validate.mockResolvedValue(true);
      usersRepository.findByUserId.mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user_id).toBe('user-123');
      expect(mockRequest.user).toEqual({
        user_id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
      });
    });

    it('should handle error from cognitoStrategy.validate', async () => {
      const context = createMockExecutionContext(`Bearer ${validToken}`);
      const error = new UnauthorizedException('Token expired');
      cognitoStrategy.validate.mockRejectedValue(error);
      errorHandler.handle.mockReturnValue(error);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(errorHandler.handle).toHaveBeenCalledWith(error);
    });
  });

  describe('Token extraction', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should extract token from Bearer authorization header', async () => {
      const context = createMockExecutionContext(`Bearer ${validToken}`);
      cognitoStrategy.validate.mockResolvedValue(true);
      usersRepository.findByUserId.mockResolvedValue(mockUser);

      await guard.canActivate(context);

      expect(cognitoStrategy.validate).toHaveBeenCalledWith(validToken);
    });

    it('should not extract token when no authorization header', async () => {
      const context = createMockExecutionContext(undefined);
      errorHandler.handle.mockReturnValue(
        new UnauthorizedException('JwtAuthGuard.canActivate: Token not found'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should not extract token with lowercase bearer', async () => {
      const context = createMockExecutionContext(`bearer ${validToken}`);
      errorHandler.handle.mockReturnValue(
        new UnauthorizedException('JwtAuthGuard.canActivate: Token not found'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('User ID extraction from token', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should throw UnauthorizedException when token has no sub claim', async () => {
      mockDecodeJwt.mockReturnValue({});
      const context = createMockExecutionContext(`Bearer ${validToken}`);
      cognitoStrategy.validate.mockResolvedValue(true);
      errorHandler.handle.mockReturnValue(
        new UnauthorizedException('JwtAuthGuard.canActivate: User ID not found in token'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
