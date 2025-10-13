import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto';
import { Prisma } from 'src/generated/prisma';
import { CustomLogger } from '../common/logger/custom-logger.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('AuthService');
  }

  async signUp(createUserDto: CreateUserDto) {
    this.logger.log(`Sign up attempt for email: ${createUserDto.email}`);
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.usersService.create({
        ...createUserDto,
        password: hashedPassword,
      });

      this.logger.log(`User created successfully: ${user.email}`);
      // パスワードを除外して返す
      const { password, ...result } = user;
      return result;
    } catch (error) {
      // P2002: Unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(`Sign up failed: Email already exists - ${createUserDto.email}`);
        throw new ConflictException('Email already exists');
      }
      this.logger.error(`Sign up error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<any> {
    this.logger.log(`Sign in attempt for email: ${email}`);
    // 1回の検索で認証に必要な情報を全て取得
    const user = await this.usersService.findByEmailWithPassword(email);

    // ユーザーが存在しない、またはパスワードが一致しない場合は同じエラーメッセージ
    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.logger.warn(`Sign in failed: Invalid credentials for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // JWTペイロードは最小限に
    const payload = { sub: user.id, email: user.email };

    this.logger.log(`Sign in successful for user: ${user.email}`);

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
