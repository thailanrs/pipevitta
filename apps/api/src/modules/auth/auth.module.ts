import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    // Configure JWT Module globally across NestJS features
    JwtModule.register({
      global: true,
      secret:
        process.env.JWT_SECRET || 'super_secret_jwt_key_for_dev_only_123456789',
      signOptions: { expiresIn: '24h' }, // Standard session duration for operator logins
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
