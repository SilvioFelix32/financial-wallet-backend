import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  GoneException,
} from '@nestjs/common';
import { ErrorHandler } from '@/shared/errors/error-handler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('handle', () => {
    it('should return NotFoundException for NotFoundException', () => {
      const error = new Error('Not found');
      error.name = 'NotFoundException';

      const result = errorHandler.handle(error);

      expect(result).toBeInstanceOf(NotFoundException);
    });

    it('should return ConflictException for ConflictException', () => {
      const error = new Error('Conflict');
      error.name = 'ConflictException';

      const result = errorHandler.handle(error);

      expect(result).toBeInstanceOf(ConflictException);
    });

    it('should return BadRequestException for BadRequestException', () => {
      const error = new Error('Bad request');
      error.name = 'BadRequestException';

      const result = errorHandler.handle(error);

      expect(result).toBeInstanceOf(BadRequestException);
    });

    it('should return UnauthorizedException for UnauthorizedException', () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedException';

      const result = errorHandler.handle(error);

      expect(result).toBeInstanceOf(UnauthorizedException);
    });

    it('should return GoneException for GoneException', () => {
      const error = new Error('Gone');
      error.name = 'GoneException';

      const result = errorHandler.handle(error);

      expect(result).toBeInstanceOf(GoneException);
    });

    it('should return InternalServerErrorException for unknown error types', () => {
      const error = new Error('Unknown error');
      error.name = 'UnknownException';

      const result = errorHandler.handle(error);

      expect(result).toBeInstanceOf(InternalServerErrorException);
    });

    it('should return InternalServerErrorException for generic Error', () => {
      const result = errorHandler.handle(new Error('Generic error'));

      expect(result).toBeInstanceOf(InternalServerErrorException);
    });

    it('should handle non-Error objects', () => {
      const result = errorHandler.handle('string error');

      expect(result).toBeInstanceOf(InternalServerErrorException);
    });

    it('should handle null error', () => {
      const result = errorHandler.handle(null);

      expect(result).toBeInstanceOf(InternalServerErrorException);
    });

    it('should handle undefined error', () => {
      const result = errorHandler.handle(undefined);

      expect(result).toBeInstanceOf(InternalServerErrorException);
    });

    it('should handle number as error', () => {
      const result = errorHandler.handle(404);

      expect(result).toBeInstanceOf(InternalServerErrorException);
    });

    it('should handle object as error', () => {
      const result = errorHandler.handle({ code: 'ERROR_001', message: 'Custom error' });

      expect(result).toBeInstanceOf(InternalServerErrorException);
    });
  });
});
