import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string | null) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      await this.auditService.log({
        userEmail: dto.email,
        role: dto.role,
        action: 'LOGIN_FAILED',
        entity: 'AUTH',
        details: 'Invalid credentials',
        ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== dto.role) {
      await this.auditService.log({
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        action: 'LOGIN_FAILED',
        entity: 'AUTH',
        entityId: user.id,
        details: `Attempted login as ${dto.role}`,
        ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials for selected role');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS),
    );

    await this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      entity: 'AUTH',
      entityId: user.id,
      ipAddress,
    });

    const forcePasswordChange = await this.prisma.systemSetting.findUnique({
      where: { key: 'force_password_change' },
    });
    const isFirstLogin = forcePasswordChange?.value === 'false' ? false : user.isFirstLogin;

    return { ...tokens, isFirstLogin };
  }

  async changePassword(userId: number, dto: ChangePasswordDto, ipAddress?: string | null) {
    const user = await this.usersService.findById(userId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.password))) {
      await this.auditService.log({
        userId,
        userEmail: user?.email,
        role: user?.role,
        action: 'PASSWORD_CHANGE_FAILED',
        entity: 'USER',
        entityId: userId,
        details: 'Current password did not match',
        ipAddress,
      });
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersService.changePassword(userId, hashed);

    await this.auditService.log({
      userId,
      userEmail: user.email,
      role: user.role,
      action: 'PASSWORD_CHANGE',
      entity: 'USER',
      entityId: userId,
      ipAddress,
    });

    return { message: 'Password changed successfully' };
  }

  async refresh(rawRefreshToken: string) {
    let payload: { sub: number; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user?.refreshToken) throw new UnauthorizedException();

    const valid = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException('Refresh token mismatch');

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS),
    );
    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async issueTokens(userId: number, email: string, role: Role) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET ?? 'secret',
        expiresIn: '15m' as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
        expiresIn: '7d' as any,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}