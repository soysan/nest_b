import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SignInDto } from './dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: SignInDto) {
    const { email, password } = signInDto;
    return this.authService.signIn(email, password);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return req.user;
  }
}
