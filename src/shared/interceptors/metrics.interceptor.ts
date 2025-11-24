import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private requestCount = 0;
  private requestTimes: number[] = [];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    this.requestCount++;

    return next.handle().pipe(
      tap({
        next: () => {
          const delay = Date.now() - now;
          this.requestTimes.push(delay);

          if (this.requestTimes.length > 100) {
            this.requestTimes.shift();
          }
        },
      }),
    );
  }

  getMetrics() {
    const avgTime =
      this.requestTimes.length > 0
        ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
        : 0;

    return {
      totalRequests: this.requestCount,
      averageResponseTime: Math.round(avgTime),
      requestsInLast100: this.requestTimes.length,
    };
  }
}

