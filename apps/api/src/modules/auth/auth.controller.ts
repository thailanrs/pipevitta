import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<any> {
    return this.authService.login(
      loginDto.tenantSlug,
      loginDto.email,
      loginDto.passwordHash,
    );
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUsers(): Promise<any[]> {
    return this.authService.getUsers();
  }
}
