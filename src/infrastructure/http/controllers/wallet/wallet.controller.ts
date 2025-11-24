import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletService } from '@/domain/services/wallet/wallet.service';
import { DepositDto } from '@/application/dtos/wallet/deposit.dto';
import { TransferDto } from '@/application/dtos/wallet/transfer.dto';
import { RevertDto } from '@/application/dtos/wallet/revert.dto';
import { TransactionsQueryDto } from '@/application/dtos/wallet/transactions-query.dto';
import { CognitoAuthGuard } from '@/infrastructure/security/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/security/auth/decorators/current-user.decorator';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(CognitoAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit money to wallet' })
  @ApiResponse({ status: 200, description: 'Deposit successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token or user_id invalid' })
  async deposit(
    @CurrentUser() userId: string,
    @Body() depositDto: DepositDto,
  ) {
    return this.walletService.deposit(userId, depositDto);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer money to another user' })
  @ApiResponse({ status: 200, description: 'Transfer successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token or user_id invalid' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  @ApiResponse({ status: 422, description: 'Insufficient balance' })
  async transfer(
    @CurrentUser() userId: string,
    @Body() transferDto: TransferDto,
  ) {
    return this.walletService.transfer(userId, transferDto);
  }

  @Post('revert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revert a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction reverted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or already reverted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token or user_id invalid' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 422, description: 'Insufficient balance to revert' })
  async revert(
    @CurrentUser() userId: string,
    @Body() revertDto: RevertDto,
  ) {
    return this.walletService.revert(userId, revertDto);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get current wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token or user_id invalid' })
  async getBalance(@CurrentUser() userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get user transactions with pagination' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token or user_id invalid' })
  async getTransactions(
    @CurrentUser() userId: string,
    @Query() query: TransactionsQueryDto,
  ) {
    return this.walletService.getTransactions(userId, query);
  }
}

