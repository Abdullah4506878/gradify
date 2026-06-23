import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';
import { randomBytes } from 'crypto';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CsvUserRow, ImportUsersResult } from './dto/import-users.dto';
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

  async importFromCsv(buffer: Buffer): Promise<ImportUsersResult> {
    let records: CsvUserRow[];
    try {
      records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw new BadRequestException('Failed to parse CSV file');
    }

    const validRoles = new Set(Object.values(Role));
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      if (!row.email || !isEmail(row.email)) {
        errors.push(`Row ${rowNum}: invalid email "${row.email ?? ''}"`);
        skipped++;
        continue;
      }

      if (row.role && !validRoles.has(row.role as Role)) {
        errors.push(`Row ${rowNum}: invalid role "${row.role}" for ${row.email}`);
        skipped++;
        continue;
      }

      const existing = await this.findByEmail(row.email);
      if (existing) {
        errors.push(`Row ${rowNum}: duplicate email "${row.email}"`);
        skipped++;
        continue;
      }

      const plainPassword = randomBytes(4).toString('hex');
      console.log(`[CSV Import] ${row.email} → password: ${plainPassword}`);

      try {
        const hashed = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
        await this.prisma.user.create({
          data: {
            name: row.name || null,
            email: row.email,
            password: hashed,
            role: (row.role as Role) || Role.STUDENT,
            universityId: row.universityId ? parseInt(row.universityId, 10) : null,
          },
        });
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown error';
        errors.push(`Row ${rowNum}: failed to create "${row.email}" — ${message}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
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
