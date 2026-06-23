import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMeDto, UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  universityId: true,
  university: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateRefreshToken(id: number, refreshToken: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { refreshToken } });
  }

  findAll(filters: { role?: Role; universityId?: number }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters.role && { role: filters.role }),
        ...(filters.universityId && { universityId: filters.universityId }),
      },
      select: safeUserSelect,
    });
  }

  async findMe(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(dto: CreateUserDto) {
    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const { password: _, refreshToken: __, ...safe } = await this.prisma.user.create({
      data: { ...dto, password: hashed },
      include: { university: true },
    });
    return safe;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const data: Partial<UpdateUserDto> = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    const { password: _, refreshToken: __, ...safe } = await this.prisma.user.update({
      where: { id },
      data,
      include: { university: true },
    });
    return safe;
  }

  async updateMe(id: number, dto: UpdateMeDto) {
    await this.ensureExists(id);
    const data: { name?: string; password?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.password) data.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const { password: _, refreshToken: __, ...safe } = await this.prisma.user.update({
      where: { id },
      data,
      include: { university: true },
    });
    return safe;
  }

  async removeUser(id: number) {
    await this.ensureExists(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User removed successfully' };
  }

  private async ensureExists(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
  }
}
