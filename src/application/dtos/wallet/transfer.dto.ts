import { IsNumber, IsPositive, IsString, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({
    example: '41db5540-90b1-7045-f572-04a74816165e',
    description: 'Recipient user ID from Cognito',
  })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty({ example: 50.0, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  amount: number;
}

