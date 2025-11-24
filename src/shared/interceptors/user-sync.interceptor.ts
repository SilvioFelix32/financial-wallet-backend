import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UsersService } from '@/domain/services/users/users.service';

@Injectable()
export class UserSyncInterceptor implements NestInterceptor {
  constructor(private readonly usersService: UsersService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.user_id) {
      this.usersService
        .findOrCreate({
          user_id: user.user_id,
          name: user.name || user.email,
          email: user.email,
        })
        .catch((error) => {
          console.error('Error syncing user:', error);
        });
    }

    return next.handle();
  }
}

