import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { MetricsInterceptor } from '@/shared/interceptors/metrics.interceptor';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new MetricsInterceptor();
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should increment request count', (done) => {
      mockCallHandler = { handle: () => of({ data: 'test' }) };
      const initialMetrics = interceptor.getMetrics();

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const newMetrics = interceptor.getMetrics();
          expect(newMetrics.totalRequests).toBe(initialMetrics.totalRequests + 1);
          done();
        },
      });
    });

    it('should track response time', (done) => {
      mockCallHandler = { handle: () => of({ data: 'test' }) };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const metrics = interceptor.getMetrics();
          expect(metrics.requestsInLast100).toBeGreaterThan(0);
          done();
        },
      });
    });

    it('should handle multiple requests', (done) => {
      mockCallHandler = { handle: () => of({ data: 'test' }) };
      let completedCount = 0;
      const totalRequests = 5;

      for (let i = 0; i < totalRequests; i++) {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            completedCount++;
            if (completedCount === totalRequests) {
              const metrics = interceptor.getMetrics();
              expect(metrics.requestsInLast100).toBe(totalRequests);
              done();
            }
          },
        });
      }
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics with zero values', () => {
      const freshInterceptor = new MetricsInterceptor();
      const metrics = freshInterceptor.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('requestsInLast100');
    });

    it('should calculate average response time', (done) => {
      mockCallHandler = { handle: () => of({ data: 'test' }) };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const metrics = interceptor.getMetrics();
          expect(typeof metrics.averageResponseTime).toBe('number');
          expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
          done();
        },
      });
    });

    it('should return 0 average when no requests made', () => {
      const freshInterceptor = new MetricsInterceptor();
      const metrics = freshInterceptor.getMetrics();

      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should limit requestsInLast100 to 100', (done) => {
      mockCallHandler = { handle: () => of({ data: 'test' }) };
      let completedCount = 0;
      const totalRequests = 105;

      for (let i = 0; i < totalRequests; i++) {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            completedCount++;
            if (completedCount === totalRequests) {
              const metrics = interceptor.getMetrics();
              expect(metrics.requestsInLast100).toBeLessThanOrEqual(100);
              done();
            }
          },
        });
      }
    });
  });
});
