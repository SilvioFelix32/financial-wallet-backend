import { Injectable, Inject } from '@nestjs/common';
import { IUsersRepository, USERS_REPOSITORY_TOKEN } from './users.repository.interface';
import { User } from '@/domain/entities/user.entity';
import { UsersQueryDto } from '@/application/dtos/users/users-query.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY_TOKEN)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async create(data: { user_id: string; name: string; email: string }): Promise<User> {
    return this.usersRepository.create(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByUserId(user_id: string): Promise<User | null> {
    return this.usersRepository.findByUserId(user_id);
  }

  async findOrCreate(data: { user_id: string; name: string; email: string }): Promise<User> {
    const existingUser = await this.usersRepository.findByUserId(data.user_id);
    if (existingUser) {
      return existingUser;
    }

    return this.usersRepository.create(data);
  }

  async findAll(query: UsersQueryDto) {
    const page = query.page || DEFAULT_PAGE;
    const limit = query.limit || DEFAULT_LIMIT;

    const { users, total } = await this.usersRepository.findAll(page, limit);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
