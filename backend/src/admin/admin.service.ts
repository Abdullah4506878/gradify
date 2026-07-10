import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { CreateManagerDto } from './dto/create-manager.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats() {
    const [universities, managers, programs, sessions] = await Promise.all([
      this.prisma.university.count(),
      this.prisma.user.count({ where: { role: Role.MANAGER } }),
      this.prisma.program.count(),
      this.prisma.academicSession.count(),
    ]);
    return { universities, managers, programs, sessions };
  }

  // ── Universities ──────────────────────────────────────────────────────────

  getUniversities() {
    return this.prisma.university.findMany({
      include: {
        departments: { include: { programs: true } },
        users: {
          where: { role: Role.MANAGER },
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUniversity(dto: CreateUniversityDto) {
    const existing = await this.prisma.university.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new ConflictException(`Code "${dto.code}" already in use`);

    const uni = await this.prisma.university.create({ data: dto });
    await this.prisma.activityLog.create({
      data: {
        action: 'created',
        entityType: 'university',
        entityId: uni.id,
        entityName: uni.name,
      },
    });
    return uni;
  }

  async updateUniversity(id: number, dto: Partial<CreateUniversityDto>) {
    await this.findUniversityOrFail(id);
    const uni = await this.prisma.university.update({ where: { id }, data: dto });
    await this.prisma.activityLog.create({
      data: {
        action: 'updated',
        entityType: 'university',
        entityId: uni.id,
        entityName: uni.name,
      },
    });
    return uni;
  }

  async deleteUniversity(id: number) {
    const uni = await this.findUniversityOrFail(id);
    await this.prisma.university.delete({ where: { id } });
    await this.prisma.activityLog.create({
      data: {
        action: 'deleted',
        entityType: 'university',
        entityId: id,
        entityName: uni.name,
      },
    });
    return { deleted: true };
  }

  private async findUniversityOrFail(id: number) {
    const uni = await this.prisma.university.findUnique({ where: { id } });
    if (!uni) throw new NotFoundException(`University #${id} not found`);
    return uni;
  }

  // ── Managers ──────────────────────────────────────────────────────────────

  getManagers() {
    return this.prisma.user.findMany({
      where: { role: Role.MANAGER },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        university: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createManager(dto: CreateManagerDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException(`Email "${dto.email}" already registered`);

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const manager = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hash,
        role: Role.MANAGER,
        ...(dto.universityId ? { universityId: dto.universityId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        university: { select: { id: true, name: true } },
      },
    });
    await this.prisma.activityLog.create({
      data: {
        action: 'created',
        entityType: 'manager',
        entityId: manager.id,
        entityName: manager.name ?? manager.email,
      },
    });
    return manager;
  }

  async updateManager(id: number, dto: Partial<CreateManagerDto>) {
    await this.findManagerOrFail(id);
    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.password = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const manager = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        university: { select: { id: true, name: true } },
      },
    });
    await this.prisma.activityLog.create({
      data: {
        action: 'updated',
        entityType: 'manager',
        entityId: manager.id,
        entityName: manager.name ?? manager.email,
      },
    });
    return manager;
  }

  async updateManagerStatus(id: number, isActive: boolean) {
    await this.findManagerOrFail(id);
    const manager = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });
    await this.prisma.activityLog.create({
      data: {
        action: isActive ? 'activated' : 'suspended',
        entityType: 'manager',
        entityId: manager.id,
        entityName: manager.name ?? manager.email,
      },
    });
    return manager;
  }

  async deleteManager(id: number) {
    const manager = await this.findManagerOrFail(id);
    await this.prisma.user.delete({ where: { id } });
    await this.prisma.activityLog.create({
      data: {
        action: 'deleted',
        entityType: 'manager',
        entityId: id,
        entityName: manager.name ?? manager.email,
      },
    });
    return { deleted: true };
  }

  private async findManagerOrFail(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.MANAGER },
    });
    if (!user) throw new NotFoundException(`Manager #${id} not found`);
    return user;
  }

  // ── Activity log ──────────────────────────────────────────────────────────

  getActivityLog() {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ── System settings ───────────────────────────────────────────────────────

  getSettings() {
    return this.prisma.systemSetting.findMany({ orderBy: { id: 'asc' } });
  }

  async updateSetting(key: string, value: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return this.prisma.systemSetting.update({ where: { key }, data: { value } });
  }

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async getCurrentSemester(): Promise<{ semester: 'FALL' | 'SPRING'; year: number }> {
    const [semVal, yearVal] = await Promise.all([
      this.getSetting('current_semester'),
      this.getSetting('current_year'),
    ]);

    const now = new Date();
    const month = now.getMonth() + 1; // 1–12
    const currentYear = now.getFullYear();

    const semester: 'FALL' | 'SPRING' =
      semVal === 'FALL' || semVal === 'SPRING'
        ? semVal
        : month >= 8 ? 'FALL' : 'SPRING';

    const parsed = yearVal && yearVal !== 'AUTO' ? parseInt(yearVal, 10) : NaN;
    const year = isNaN(parsed) ? currentYear : parsed;

    return { semester, year };
  }
}
