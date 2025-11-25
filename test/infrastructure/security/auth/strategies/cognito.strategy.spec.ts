import { UnauthorizedException } from '@nestjs/common';
import { CognitoStrategy } from '@/infrastructure/security/auth/strategies/cognito.strategy';
import { CacheService } from '@/domain/services/cache/cache.service';
import * as jose from 'jose';
import axios from 'axios';

jest.mock('axios');
jest.mock('jose', () => ({
  decodeJwt: jest.fn(),
  decodeProtectedHeader: jest.fn(),
  jwtVerify: jest.fn(),
  importJWK: jest.fn(),
}));

describe('CognitoStrategy', () => {
  let strategy: CognitoStrategy;
  let mockCacheService: jest.Mocked<CacheService>;
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockedJose = jose as jest.Mocked<typeof jose>;

  const mockJwk = { kid: 'test-kid', kty: 'RSA', n: 'test-n', e: 'AQAB' };
  const mockJwks = { keys: [mockJwk] };

  beforeEach(() => {
    mockCacheService = {
      getCache: jest.fn(),
      setCache: jest.fn(),
      deleteCache: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    strategy = new CognitoStrategy(mockCacheService);
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('should return false when token is empty', async () => {
      const result = await strategy.validate('');
      expect(result).toBe(false);
    });

    it('should return false when token is null', async () => {
      const result = await strategy.validate(null as any);
      expect(result).toBe(false);
    });

    it('should return false when token is undefined', async () => {
      const result = await strategy.validate(undefined as any);
      expect(result).toBe(false);
    });

    it('should return true when token is valid', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKey = { type: 'public' };

      mockedJose.decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockedJose.decodeProtectedHeader.mockReturnValue({ kid: 'test-kid' });
      mockCacheService.getCache.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValue({ data: mockJwks });
      mockedJose.importJWK.mockResolvedValue(mockKey as any);
      mockedJose.jwtVerify.mockResolvedValue({ payload: { sub: 'user-1' }, protectedHeader: {} } as any);

      const result = await strategy.validate(mockToken);

      expect(result).toBe(true);
      expect(mockedJose.decodeJwt).toHaveBeenCalledWith(mockToken);
    });

    it('should use cached key when available', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKey = { type: 'public' };

      mockedJose.decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockedJose.decodeProtectedHeader.mockReturnValue({ kid: 'test-kid' });
      mockCacheService.getCache.mockResolvedValue(mockJwk);
      mockedJose.importJWK.mockResolvedValue(mockKey as any);
      mockedJose.jwtVerify.mockResolvedValue({ payload: { sub: 'user-1' }, protectedHeader: {} } as any);

      const result = await strategy.validate(mockToken);

      expect(result).toBe(true);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when verification fails', async () => {
      const mockToken = 'invalid.jwt.token';
      mockedJose.decodeJwt.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(strategy.validate(mockToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should return false when payload is empty', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKey = { type: 'public' };

      mockedJose.decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockedJose.decodeProtectedHeader.mockReturnValue({ kid: 'test-kid' });
      mockCacheService.getCache.mockResolvedValue(mockJwk);
      mockedJose.importJWK.mockResolvedValue(mockKey as any);
      mockedJose.jwtVerify.mockResolvedValue({ payload: null, protectedHeader: {} } as any);

      const result = await strategy.validate(mockToken);

      expect(result).toBe(false);
    });

    it('should throw UnauthorizedException when key not found in jwks', async () => {
      const mockToken = 'valid.jwt.token';

      mockedJose.decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockedJose.decodeProtectedHeader.mockReturnValue({ kid: 'non-existent-kid' });
      mockCacheService.getCache.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValue({ data: mockJwks });

      await expect(strategy.validate(mockToken)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockToken)).rejects.toThrow('Key not found in jwks');
    });

    it('should cache key after fetching from jwks', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKey = { type: 'public' };

      mockedJose.decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockedJose.decodeProtectedHeader.mockReturnValue({ kid: 'test-kid' });
      mockCacheService.getCache.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValue({ data: mockJwks });
      mockedJose.importJWK.mockResolvedValue(mockKey as any);
      mockedJose.jwtVerify.mockResolvedValue({ payload: { sub: 'user-1' }, protectedHeader: {} } as any);

      await strategy.validate(mockToken);

      expect(mockCacheService.setCache).toHaveBeenCalledWith('key', mockJwk, 60 * 60 * 3);
    });

    it('should throw UnauthorizedException when jwks fetch fails', async () => {
      const mockToken = 'valid.jwt.token';

      mockedJose.decodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockedJose.decodeProtectedHeader.mockReturnValue({ kid: 'test-kid' });
      mockCacheService.getCache.mockResolvedValue(null);
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(strategy.validate(mockToken)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockToken)).rejects.toThrow('error while getting jwks');
    });
  });
});
