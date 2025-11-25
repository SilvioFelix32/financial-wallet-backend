import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { UserSyncInterceptor } from '@/shared/interceptors/user-sync.interceptor';
import { UsersService } from '@/domain/services/users/users.service';

describe('UserSyncInterceptor', () => {
  let interceptor: UserSyncInterceptor;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockCallHandler: CallHandler;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockUsersService = { findOrCreate: jest.fn() } as unknown as jest.Mocked<UsersService>;
    interceptor = new UserSyncInterceptor(mockUsersService);
    mockCallHandler = { handle: () => of({ data: 'test' }) };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  };

  describe('intercept', () => {
    it('should sync user when user with user_id is present', (done) => {
      const user = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      const context = createMockContext(user);
      mockUsersService.findOrCreate.mockResolvedValue(user as any);

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: () => {
          expect(mockUsersService.findOrCreate).toHaveBeenCalledWith({
            user_id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
          });
          done();
        },
      });
    });

    it('should use email as name fallback when name is not provided', (done) => {
      const user = { user_id: 'user-1', email: 'john@example.com' };
      const context = createMockContext(user);
      mockUsersService.findOrCreate.mockResolvedValue(user as any);

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: () => {
          expect(mockUsersService.findOrCreate).toHaveBeenCalledWith({
            user_id: 'user-1',
            name: 'john@example.com',
            email: 'john@example.com',
          });
          done();
        },
      });
    });

    it('should not sync user when user is not present', (done) => {
      const context = createMockContext(null);

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: () => {
          expect(mockUsersService.findOrCreate).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should not sync user when user_id is not present', (done) => {
      const user = { email: 'john@example.com' };
      const context = createMockContext(user);

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: () => {
          expect(mockUsersService.findOrCreate).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle errors in findOrCreate gracefully', (done) => {
      const user = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      const context = createMockContext(user);
      mockUsersService.findOrCreate.mockRejectedValue(new Error('Database error'));

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error syncing user:', expect.any(Error));
            done();
          }, 10);
        },
      });
    });

    it('should continue request handling even when sync fails', (done) => {
      const user = { user_id: 'user-1', name: 'John Doe', email: 'john@example.com' };
      const context = createMockContext(user);
      mockUsersService.findOrCreate.mockRejectedValue(new Error('Database error'));

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({ data: 'test' });
          done();
        },
      });
    });

    it('should handle undefined user object', (done) => {
      const context = createMockContext(undefined);

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: () => {
          expect(mockUsersService.findOrCreate).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
