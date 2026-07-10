import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { isEmail } from 'class-validator';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FileUserRow, ImportUsersResult } from './dto/import-users.dto';
import { UpdateMeDto, UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  rollNumber: true,
  section: true,
  role: true,
  maxGroups: true,
  universityId: true,
  university: true,
  githubUrl: true,
  linkedinUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

const COL_ALIASES: Record<string, string[]> = {
  name: ['name', 'student name', 'full name'],
  email: ['email', 'mail', 'email address'],
  rollNumber: ['roll', 'reg', 'registration', 'roll no', 'roll number'],
  section: ['section', 'class', 'batch'],
};

function detectCols(headers: string[]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    result[field] = headers.find((h) =>
      aliases.some((alias) => h.toLowerCase().includes(alias)),
    );
  }
  return result;
}

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

  async findAll(filters: { role?: Role; universityId?: number }) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters.role && { role: filters.role }),
        ...(filters.universityId && { universityId: filters.universityId }),
      },
      select: safeUserSelect,
    });

    if (filters.role === Role.SUPERVISOR) {
      const assignedCounts = await this.prisma.supervisorPreference.groupBy({
        by: ['supervisorId'],
        where: { preference: 1 },
        _count: { supervisorId: true },
      });
      const countMap = new Map(assignedCounts.map((a) => [a.supervisorId, a._count.supervisorId]));
      return users.map((u) => ({ ...u, assignedGroupsCount: countMap.get(u.id) ?? 0 }));
    }

    return users;
  }

  async updateWorkload(id: number, maxGroups: number) {
    if (maxGroups < 1 || maxGroups > 10) {
      throw new BadRequestException('maxGroups must be between 1 and 10');
    }
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    if (user.role !== Role.SUPERVISOR) {
      throw new BadRequestException('Can only update workload for supervisors');
    }
    const { password: _, refreshToken: __, ...safe } = await this.prisma.user.update({
      where: { id },
      data: { maxGroups },
    });
    return safe;
  }

  async updateWorkloadBulk(maxGroups: number) {
    if (maxGroups < 1 || maxGroups > 10) {
      throw new BadRequestException('maxGroups must be between 1 and 10');
    }
    const result = await this.prisma.user.updateMany({
      where: { role: Role.SUPERVISOR },
      data: { maxGroups },
    });
    return { updated: result.count, maxGroups };
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

  async updateProfile(id: number, dto: UpdateProfileDto) {
    await this.ensureExists(id);
    if (dto.githubUrl && !dto.githubUrl.startsWith('https://github.com/')) {
      throw new BadRequestException('GitHub URL must start with https://github.com/');
    }
    if (dto.linkedinUrl && !dto.linkedinUrl.startsWith('https://linkedin.com/in/')) {
      throw new BadRequestException('LinkedIn URL must start with https://linkedin.com/in/');
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.githubUrl !== undefined) data.githubUrl = dto.githubUrl;
    if (dto.linkedinUrl !== undefined) data.linkedinUrl = dto.linkedinUrl;
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

  async importFromFile(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): Promise<ImportUsersResult> {
    const isXlsx =
      mimetype.includes('spreadsheetml') ||
      originalname.toLowerCase().endsWith('.xlsx');

    let rawRecords: FileUserRow[];
    try {
      if (isXlsx) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rawRecords = XLSX.utils.sheet_to_json<FileUserRow>(worksheet);
      } else {
        rawRecords = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
      }
    } catch {
      throw new BadRequestException('Failed to parse file — check the format and try again');
    }

    if (rawRecords.length === 0) return { added: 0, updated: 0, imported: 0, skipped: 0, errors: [] };

    const headers = Object.keys(rawRecords[0]);
    const cols = detectCols(headers);

    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawRecords.length; i++) {
      const raw = rawRecords[i];
      const rowNum = i + 1;

      const nameVal = cols.name && raw[cols.name] ? String(raw[cols.name]).trim() || null : null;
      const emailVal = cols.email && raw[cols.email] ? String(raw[cols.email]).trim() : '';
      const rollVal = cols.rollNumber && raw[cols.rollNumber] ? String(raw[cols.rollNumber]).trim() || null : null;
      const sectionVal = cols.section && raw[cols.section] ? String(raw[cols.section]).trim() || null : null;

      if (!emailVal && !rollVal) {
        errors.push(`Row ${rowNum}: no email or roll number found`);
        skipped++;
        continue;
      }

      // Key lookup: rollNumber first, email second
      let existing: { id: number } | null = null;
      if (rollVal) {
        existing = await this.prisma.user.findUnique({ where: { rollNumber: rollVal }, select: { id: true } });
      }
      if (!existing && emailVal) {
        existing = await this.prisma.user.findUnique({ where: { email: emailVal }, select: { id: true } });
      }

      if (existing) {
        // Update name + section only
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            ...(nameVal !== null && { name: nameVal }),
            ...(sectionVal !== null && { section: sectionVal }),
          },
        });
        updated++;
      } else {
        // Create new student
        if (!emailVal || !isEmail(emailVal)) {
          errors.push(`Row ${rowNum}: invalid or missing email "${emailVal}" — cannot create user`);
          skipped++;
          continue;
        }
        try {
          const hashed = await bcrypt.hash('Test@123', BCRYPT_ROUNDS);
          await this.prisma.user.create({
            data: {
              email: emailVal,
              name: nameVal,
              rollNumber: rollVal,
              section: sectionVal,
              password: hashed,
              role: Role.STUDENT,
            },
          });
          added++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'unknown error';
          errors.push(`Row ${rowNum}: failed to create "${emailVal}" — ${message}`);
          skipped++;
        }
      }
    }

    return { added, updated, imported: added + updated, skipped, errors };
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
