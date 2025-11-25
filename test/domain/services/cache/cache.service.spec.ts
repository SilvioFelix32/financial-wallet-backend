import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '@/domain/services/cache/cache.service';
import { RedisService } from '@/domain/services/redis/redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisClient: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisService, useValue: { getClient: jest.fn().mockReturnValue(mockRedisClient) } },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCache', () => {
    it('should return parsed data when cache exists', async () => {
      const cachedData = { user_id: 'user-1', name: 'John Doe' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getCache<typeof cachedData>('user:user-1');

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('user:user-1');
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
    });

    it('should return null when cache does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getCache('non-existent-key');

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('non-existent-key');
    });

    it('should return null and log error when Redis throws an error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'));

      const result = await service.getCache('some-key');

      expect(result).toBeNull();
      consoleErrorSpy.mockRestore();
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
        pagination: { page: 1, total: 100 },
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(complexData));

      const result = await service.getCache<typeof complexData>('complex-key');

      expect(result).toEqual(complexData);
    });

    it('should handle array data', async () => {
      const arrayData = [1, 2, 3, 4, 5];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(arrayData));

      const result = await service.getCache<number[]>('array-key');

      expect(result).toEqual(arrayData);
    });

    it('should handle string data', async () => {
      const stringData = 'simple string';
      mockRedisClient.get.mockResolvedValue(JSON.stringify(stringData));

      const result = await service.getCache<string>('string-key');

      expect(result).toBe(stringData);
    });
  });

  describe('setCache', () => {
    it('should set cache with TTL and return success message', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      const data = { user_id: 'user-1', name: 'John Doe' };

      const result = await service.setCache('user:user-1', data, 3600);

      expect(result).toBe('Cache created for key: user:user-1');
      expect(mockRedisClient.set).toHaveBeenCalledWith('user:user-1', JSON.stringify(data), 'EX', 3600);
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
    });

    it('should set cache with different TTL values', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.setCache('key1', { data: 1 }, 60);
      await service.setCache('key2', { data: 2 }, 86400);

      expect(mockRedisClient.set).toHaveBeenNthCalledWith(1, 'key1', JSON.stringify({ data: 1 }), 'EX', 60);
      expect(mockRedisClient.set).toHaveBeenNthCalledWith(2, 'key2', JSON.stringify({ data: 2 }), 'EX', 86400);
    });

    it('should throw error when Redis fails to set cache', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis write error'));

      await expect(service.setCache('some-key', { data: 'test' }, 3600)).rejects.toThrow('Error setting cache');
    });

    it('should handle complex nested objects', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      const complexData = {
        transactions: [{ id: 'tx-1', amount: 100 }, { id: 'tx-2', amount: 200 }],
        meta: { total: 2 },
      };

      await service.setCache('transactions:user-1', complexData, 1800);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'transactions:user-1',
        JSON.stringify(complexData),
        'EX',
        1800,
      );
    });

    it('should handle array data', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      const arrayData = ['item1', 'item2', 'item3'];

      await service.setCache('list-key', arrayData, 600);

      expect(mockRedisClient.set).toHaveBeenCalledWith('list-key', JSON.stringify(arrayData), 'EX', 600);
    });

    it('should handle primitive values', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.setCache('number-key', 42, 300);
      await service.setCache('string-key', 'test', 300);
      await service.setCache('boolean-key', true, 300);

      expect(mockRedisClient.set).toHaveBeenCalledWith('number-key', '42', 'EX', 300);
      expect(mockRedisClient.set).toHaveBeenCalledWith('string-key', '"test"', 'EX', 300);
      expect(mockRedisClient.set).toHaveBeenCalledWith('boolean-key', 'true', 'EX', 300);
    });
  });
});
