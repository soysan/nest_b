import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid password');
    }
    const payload = { username: user.name, sub: user.id };
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
