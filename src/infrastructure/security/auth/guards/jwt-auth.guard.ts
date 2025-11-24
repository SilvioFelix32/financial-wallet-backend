import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { decodeJwt } from 'jose';
import { ErrorHandler } from '@/shared/errors/error-handler';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CognitoStrategy } from '../strategies/cognito.strategy';
import { IUsersRepository, USERS_REPOSITORY_TOKEN } from '@/domain/services/users/users.repository.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly errorHandler: ErrorHandler,
    private readonly cognitoStrategy: CognitoStrategy,
    @Inject(USERS_REPOSITORY_TOKEN)
    private readonly usersRepository: IUsersRepository,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    try {
      const request = context.switchToHttp().getRequest();

      const token = this.extractTokenFromHeader(request);
      if (!token) {
        throw new UnauthorizedException(
          'JwtAuthGuard.canActivate: Token not found',
        );
      }

      const isValid = await this.isTokenValid(token);
      if (!isValid) {
        return false;
      }

      const userId = this.extractUserIdFromToken(token);
      if (!userId) {
        throw new UnauthorizedException(
          'JwtAuthGuard.canActivate: User ID not found in token',
        );
      }

      const user = await this.usersRepository.findByUserId(userId);
      if (!user) {
        throw new UnauthorizedException(
          'JwtAuthGuard.canActivate: User not found in database',
        );
      }

      request.user_id = userId;
      request.user = {
        user_id: userId,
        email: user.email,
        name: user.name,
      };

      return true;
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const decoded = decodeJwt(token);
      return decoded.sub as string | null;
    } catch (error) {
      return null;
    }
  }

  private isTokenValid(token: string): Promise<boolean> {
    try {
      return this.cognitoStrategy.validate(token);
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }
}
