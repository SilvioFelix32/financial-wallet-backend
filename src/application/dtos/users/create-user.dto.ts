import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({
        example: '41db5540-90b1-7045-f572-04a74816165e',
        description: 'User ID from Cognito',
    })
    @IsString()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({
        example: 'John Doe',
        description: 'User name',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'User email',
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;
}

