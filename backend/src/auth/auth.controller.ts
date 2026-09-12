import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt.guard';
import { LoginThrottle } from './throttler.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @LoginThrottle()
  login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.authService.login(dto, req.ip);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: Request & { user: { id: number } }) {
    return this.authService.logout(req.user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: Request & { user: { id: number } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto, req.ip);
  }
}
