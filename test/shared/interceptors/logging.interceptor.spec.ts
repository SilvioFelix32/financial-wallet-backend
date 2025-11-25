import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '@/shared/interceptors/logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const createMockContext = (method: string, url: string, statusCode: number): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url }),
        getResponse: () => ({ statusCode }),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  };

  describe('intercept', () => {
    it('should log successful requests', (done) => {
      const context = createMockContext('GET', '/users', 200);
      const callHandler: CallHandler = { handle: () => of({ data: 'test' }) };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalled();
          const logCall = logSpy.mock.calls[0][0];
          expect(logCall).toContain('GET');
          expect(logCall).toContain('/users');
          expect(logCall).toContain('200');
          done();
        },
      });
    });

    it('should log POST requests', (done) => {
      const context = createMockContext('POST', '/wallet/deposit', 201);
      const callHandler: CallHandler = { handle: () => of({ success: true }) };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalled();
          const logCall = logSpy.mock.calls[0][0];
          expect(logCall).toContain('POST');
          expect(logCall).toContain('/wallet/deposit');
          done();
        },
      });
    });

    it('should log errors', (done) => {
      const errorMessage = 'Test error';
      const context = createMockContext('GET', '/users/1', 500);
      const callHandler: CallHandler = { handle: () => throwError(() => new Error(errorMessage)) };

      interceptor.intercept(context, callHandler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalled();
          const errorCall = errorSpy.mock.calls[0][0];
          expect(errorCall).toContain('GET');
          expect(errorCall).toContain('/users/1');
          expect(errorCall).toContain(errorMessage);
          done();
        },
      });
    });

    it('should include response time in ms', (done) => {
      const context = createMockContext('GET', '/balance', 200);
      const callHandler: CallHandler = { handle: () => of({ balance: 1000 }) };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalled();
          const logCall = logSpy.mock.calls[0][0];
          expect(logCall).toMatch(/\d+ms/);
          done();
        },
      });
    });

    it('should handle DELETE requests', (done) => {
      const context = createMockContext('DELETE', '/users/1', 204);
      const callHandler: CallHandler = { handle: () => of(null) };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalled();
          const logCall = logSpy.mock.calls[0][0];
          expect(logCall).toContain('DELETE');
          expect(logCall).toContain('/users/1');
          done();
        },
      });
    });

    it('should handle PUT requests', (done) => {
      const context = createMockContext('PUT', '/users/1', 200);
      const callHandler: CallHandler = { handle: () => of({ updated: true }) };

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalled();
          const logCall = logSpy.mock.calls[0][0];
          expect(logCall).toContain('PUT');
          expect(logCall).toContain('/users/1');
          done();
        },
      });
    });
  });
});
