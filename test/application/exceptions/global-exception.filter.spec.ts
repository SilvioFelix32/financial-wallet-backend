import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '@/application/exceptions/global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HttpException handling', () => {
    it('should handle BadRequestException', () => {
      const exception = new HttpException(
        { message: 'Invalid input', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        cause: 'BadRequestException',
        message: 'Invalid input',
      });
    });

    it('should handle NotFoundException', () => {
      const exception = new HttpException(
        { message: 'User not found', error: 'Not Found' },
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        cause: 'NotFoundException',
        message: 'User not found',
      });
    });

    it('should handle UnauthorizedException', () => {
      const exception = new HttpException(
        { message: 'Invalid token', error: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.UNAUTHORIZED,
        cause: 'UnauthorizedException',
        message: 'Invalid token',
      });
    });

    it('should handle ForbiddenException', () => {
      const exception = new HttpException(
        { message: 'Access denied', error: 'Forbidden' },
        HttpStatus.FORBIDDEN,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.FORBIDDEN,
        cause: 'ForbiddenException',
        message: 'Access denied',
      });
    });

    it('should handle ConflictException', () => {
      const exception = new HttpException(
        { message: 'Resource already exists', error: 'Conflict' },
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        cause: 'ConflictException',
        message: 'Resource already exists',
      });
    });

    it('should handle GoneException', () => {
      const exception = new HttpException(
        { message: 'Resource no longer available', error: 'Gone' },
        HttpStatus.GONE,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.GONE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.GONE,
        cause: 'GoneException',
        message: 'Resource no longer available',
      });
    });

    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Simple error message', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        cause: 'InternalServerErrorException',
        message: 'An error occurred',
      });
    });

    it('should handle HttpException with name property', () => {
      const exception = new HttpException(
        { message: 'Not found error', name: 'NotFound' },
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ cause: 'NotFoundException' }),
      );
    });

    it('should default to InternalServerErrorException for unknown error types', () => {
      const exception = new HttpException(
        { message: 'Unknown error', error: 'CustomError' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ cause: 'InternalServerErrorException' }),
      );
    });
  });

  describe('Non-HttpException handling', () => {
    it('should handle generic Error', () => {
      filter.catch(new Error('Something went wrong'), mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('should handle null exception', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('should handle undefined exception', () => {
      filter.catch(undefined, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('should handle string exception', () => {
      filter.catch('string error', mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });
  });

  describe('Message extraction', () => {
    it('should extract message from object with message property', () => {
      const exception = new HttpException({ message: 'Custom error message' }, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Custom error message' }),
      );
    });

    it('should handle array message from validation errors', () => {
      const exception = new HttpException(
        { message: ['field1 is required', 'field2 must be a number'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: ['field1 is required', 'field2 must be a number'] }),
      );
    });
  });
});
