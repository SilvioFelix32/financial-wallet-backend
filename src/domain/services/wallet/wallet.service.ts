import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  Inject,
  Logger,
} from '@nestjs/common';
import { IWalletRepository, WALLET_REPOSITORY_TOKEN, PrismaTransaction } from './wallet.repository.interface';
import { IUsersRepository, USERS_REPOSITORY_TOKEN } from '../users/users.repository.interface';
import { TransactionType } from '@/domain/entities/transaction.entity';
import { DepositDto } from '@/application/dtos/wallet/deposit.dto';
import { TransferDto } from '@/application/dtos/wallet/transfer.dto';
import { RevertDto } from '@/application/dtos/wallet/revert.dto';
import { TransactionsQueryDto } from '@/application/dtos/wallet/transactions-query.dto';
import { DatabaseService } from '../database/database.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject(WALLET_REPOSITORY_TOKEN)
    private readonly walletRepository: IWalletRepository,
    @Inject(USERS_REPOSITORY_TOKEN)
    private readonly usersRepository: IUsersRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  async deposit(userId: string, depositDto: DepositDto) {
    return this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      const user = await this.findUserInTransaction(tx, userId);
      const currentBalance = Number(user.balance);

      if (currentBalance < 0) {
        await this.handleNegativeBalanceDeposit(tx, userId, currentBalance, depositDto.amount);
      } else {
        await this.handleNormalDeposit(tx, userId, currentBalance, depositDto.amount);
      }

      const updatedUser = await this.findUserInTransaction(tx, userId);
      const finalBalance = Number(updatedUser.balance);

      return {
        message: 'Deposit successful',
        balance: finalBalance,
      };
    });
  }

  async transfer(fromUserId: string, transferDto: TransferDto) {
    this.validateSelfTransfer(fromUserId, transferDto.toUserId);

    return this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      const fromUser = await this.findSenderInTransaction(tx, fromUserId);
      const toUser = await this.findRecipientInTransaction(tx, transferDto.toUserId);

      this.validateSufficientBalance(Number(fromUser.balance), transferDto.amount);

      const fromTransaction = await this.walletRepository.createTransactionInTransaction(tx, {
        userId: fromUserId,
        type: TransactionType.TRANSFER,
        amount: -transferDto.amount,
      });

      await this.walletRepository.createTransactionInTransaction(tx, {
        userId: transferDto.toUserId,
        type: TransactionType.TRANSFER,
        amount: transferDto.amount,
        referenceTransactionId: fromTransaction.id,
        senderId: fromUserId,
        senderName: fromUser.name,
      });

      const newFromBalance = Number(fromUser.balance) - transferDto.amount;
      const newToBalance = Number(toUser.balance) + transferDto.amount;

      await this.usersRepository.updateBalanceInTransaction(tx, fromUserId, newFromBalance);
      await this.usersRepository.updateBalanceInTransaction(tx, transferDto.toUserId, newToBalance);

      const updatedFromUser = await this.findUserInTransaction(tx, fromUserId);
      const finalBalance = Number(updatedFromUser.balance);

      return {
        message: 'Transfer successful',
        balance: finalBalance,
      };
    });
  }

  async revert(userId: string, revertDto: RevertDto) {
    return this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      const originalTransaction = await this.findTransactionInTransaction(
        tx,
        revertDto.transactionId,
      );

      this.validateRevertPermission(userId, originalTransaction.userId);
      await this.validateNotAlreadyReverted(revertDto.transactionId);
      this.validateNotReversalTransaction(originalTransaction.type);

      if (originalTransaction.type === TransactionType.DEPOSIT) {
        await this.revertDeposit(tx, userId, originalTransaction);
      } else if (originalTransaction.type === TransactionType.TRANSFER) {
        await this.revertTransfer(tx, userId, originalTransaction);
      }

      const updatedUser = await this.findUserInTransaction(tx, userId);
      const finalBalance = Number(updatedUser.balance);

      return {
        message: 'Transaction reverted successfully',
        balance: finalBalance,
      };
    });
  }

  async getBalance(userId: string) {
    const user = await this.usersRepository.findByUserId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { balance: user.balance };
  }

  async getTransactions(userId: string, query: TransactionsQueryDto) {
    const page = query.page || DEFAULT_PAGE;
    const limit = query.limit || DEFAULT_LIMIT;

    const { transactions, total } = await this.walletRepository.findTransactionsByUserId(
      userId,
      page,
      limit,
    );

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async handleNegativeBalanceDeposit(
    tx: PrismaTransaction,
    userId: string,
    currentBalance: number,
    depositAmount: number,
  ): Promise<void> {
    const correctionAmount = Math.abs(currentBalance);

    if (depositAmount <= correctionAmount) {
      await this.walletRepository.createTransactionInTransaction(tx, {
        userId,
        type: TransactionType.DEPOSIT,
        amount: depositAmount,
      });
    } else {
      const remainingAmount = depositAmount - correctionAmount;

      await this.walletRepository.createTransactionInTransaction(tx, {
        userId,
        type: TransactionType.DEPOSIT,
        amount: correctionAmount,
      });

      await this.walletRepository.createTransactionInTransaction(tx, {
        userId,
        type: TransactionType.DEPOSIT,
        amount: remainingAmount,
      });
    }

    const newBalance = currentBalance + depositAmount;
    await this.usersRepository.updateBalanceInTransaction(tx, userId, newBalance);
  }

  private async handleNormalDeposit(
    tx: PrismaTransaction,
    userId: string,
    currentBalance: number,
    amount: number,
  ): Promise<void> {
    await this.walletRepository.createTransactionInTransaction(tx, {
      userId,
      type: TransactionType.DEPOSIT,
      amount,
    });

    const newBalance = currentBalance + amount;
    await this.usersRepository.updateBalanceInTransaction(tx, userId, newBalance);
  }

  private async revertDeposit(
    tx: PrismaTransaction,
    userId: string,
    originalTransaction: any,
  ): Promise<void> {
    const user = await this.findUserInTransaction(tx, userId);
    const currentBalance = Number(user.balance);
    const originalAmount = Number(originalTransaction.amount);

    if (currentBalance < originalAmount) {
      throw new UnprocessableEntityException('Insufficient balance to revert deposit');
    }

    await this.walletRepository.createTransactionInTransaction(tx, {
      userId,
      type: TransactionType.REVERSAL,
      amount: -originalAmount,
      referenceTransactionId: originalTransaction.id,
    });

    const newBalance = currentBalance - originalAmount;
    await this.usersRepository.updateBalanceInTransaction(tx, userId, newBalance);
  }

  private async revertTransfer(
    tx: PrismaTransaction,
    userId: string,
    originalTransaction: any,
  ): Promise<void> {
    const amount = Number(originalTransaction.amount);
    const isOutgoing = amount < 0;

    if (isOutgoing) {
      await this.revertOutgoingTransfer(tx, userId, originalTransaction, amount);
    } else {
      await this.revertIncomingTransfer(tx, userId, originalTransaction, amount);
    }
  }

  private async revertOutgoingTransfer(
    tx: PrismaTransaction,
    userId: string,
    originalTransaction: any,
    amount: number,
  ): Promise<void> {
    const toUserId = await this.findTransferRecipient(tx, originalTransaction.id, userId);

    if (!toUserId) {
      throw new NotFoundException('Transfer recipient not found');
    }

    const toUser = await this.findUserInTransaction(tx, toUserId);
    const toUserBalance = Number(toUser.balance);

    if (toUserBalance < Math.abs(amount)) {
      throw new UnprocessableEntityException(
        'Recipient has insufficient balance to revert transfer',
      );
    }

    const fromUser = await this.findUserInTransaction(tx, userId);
    const fromUserBalance = Number(fromUser.balance);
    const absoluteAmount = Math.abs(amount);

    await this.walletRepository.createTransactionInTransaction(tx, {
      userId,
      type: TransactionType.REVERSAL,
      amount: absoluteAmount,
      referenceTransactionId: originalTransaction.id,
    });

    await this.walletRepository.createTransactionInTransaction(tx, {
      userId: toUserId,
      type: TransactionType.REVERSAL,
      amount: -absoluteAmount,
      referenceTransactionId: originalTransaction.id,
      senderId: userId,
      senderName: fromUser.name,
    });

    const newFromBalance = fromUserBalance + absoluteAmount;
    const newToBalance = toUserBalance - absoluteAmount;
    await this.usersRepository.updateBalanceInTransaction(tx, userId, newFromBalance);
    await this.usersRepository.updateBalanceInTransaction(tx, toUserId, newToBalance);
  }

  private async revertIncomingTransfer(
    tx: PrismaTransaction,
    userId: string,
    originalTransaction: any,
    amount: number,
  ): Promise<void> {
    const fromUserId = await this.findTransferSender(tx, originalTransaction);

    if (!fromUserId) {
      throw new NotFoundException('Transfer sender not found');
    }

    const fromUser = await this.findUserInTransaction(tx, fromUserId);
    const fromUserBalance = Number(fromUser.balance);

    if (fromUserBalance < amount) {
      throw new UnprocessableEntityException(
        'Sender has insufficient balance to revert transfer',
      );
    }

    const toUser = await this.findUserInTransaction(tx, userId);
    const toUserBalance = Number(toUser.balance);

    await this.walletRepository.createTransactionInTransaction(tx, {
      userId,
      type: TransactionType.REVERSAL,
      amount: -amount,
      referenceTransactionId: originalTransaction.id,
    });

    await this.walletRepository.createTransactionInTransaction(tx, {
      userId: fromUserId,
      type: TransactionType.REVERSAL,
      amount: amount,
      referenceTransactionId: originalTransaction.id,
      senderId: userId,
      senderName: toUser.name,
    });

    const newFromBalance = fromUserBalance + amount;
    const newToBalance = toUserBalance - amount;
    await this.usersRepository.updateBalanceInTransaction(tx, fromUserId, newFromBalance);
    await this.usersRepository.updateBalanceInTransaction(tx, userId, newToBalance);
  }

  private async findUserInTransaction(tx: PrismaTransaction, userId: string) {
    const user = await tx.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async findSenderInTransaction(tx: PrismaTransaction, userId: string) {
    const user = await tx.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException('Sender user not found');
    }
    return user;
  }

  private async findRecipientInTransaction(tx: PrismaTransaction, userId: string) {
    const user = await tx.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException('Recipient user not found');
    }
    return user;
  }

  private async findTransactionInTransaction(tx: PrismaTransaction, transactionId: string) {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  private async findTransferSender(tx: PrismaTransaction, transaction: any): Promise<string | null> {
    if (!transaction.referenceTransactionId) {
      return null;
    }

    const referenceTransaction = await tx.transaction.findUnique({
      where: { id: transaction.referenceTransactionId },
    });

    return referenceTransaction?.userId || null;
  }

  private validateSelfTransfer(fromUserId: string, toUserId: string): void {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }
  }

  private validateSufficientBalance(currentBalance: number, requiredAmount: number): void {
    if (currentBalance < requiredAmount) {
      throw new UnprocessableEntityException(
        `Insufficient balance. Current balance: ${currentBalance}, required: ${requiredAmount}`,
      );
    }
  }

  private validateRevertPermission(userId: string, transactionUserId: string): void {
    if (transactionUserId !== userId) {
      throw new UnauthorizedException('Cannot revert transaction from another user');
    }
  }

  private async validateNotAlreadyReverted(transactionId: string): Promise<void> {
    const existingReversal = await this.walletRepository.findTransactionByReferenceId(
      transactionId,
    );

    if (existingReversal) {
      throw new BadRequestException('Transaction already reverted');
    }
  }

  private validateNotReversalTransaction(transactionType: string): void {
    if (transactionType === TransactionType.REVERSAL) {
      throw new BadRequestException('Cannot revert a reversal transaction');
    }
  }

  private async findTransferRecipient(
    tx: PrismaTransaction,
    transactionId: string,
    senderId: string,
  ): Promise<string | null> {
    const recipientTransaction = await tx.transaction.findFirst({
      where: {
        referenceTransactionId: transactionId,
        userId: { not: senderId },
      },
    });

    return recipientTransaction?.userId || null;
  }
}
