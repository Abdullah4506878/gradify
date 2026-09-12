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
import { CreateDepartmentDto } from '../department/dto/create-department.dto';
import { CreateProgramDto } from '../program/dto/create-program.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats() {
    const [
      universities,
      managers,
      programs,
      sessions,
      totalStudents,
      totalSupervisors,
      totalGroups,
      totalTasks,
      totalProposals,
    ] = await Promise.all([
      this.prisma.university.count(),
      this.prisma.user.count({ where: { role: Role.MANAGER } }),
      this.prisma.program.count(),
      this.prisma.academicSession.count(),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.SUPERVISOR } }),
      this.prisma.group.count(),
      this.prisma.task.count(),
      this.prisma.proposal.count(),
    ]);
    return {
      universities,
      managers,
      programs,
      sessions,
      totalStudents,
      totalSupervisors,
      totalGroups,
      totalTasks,
      totalProposals,
    };
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

  // ── Departments ───────────────────────────────────────────────────────────

  getDepartments(universityId?: number) {
    return this.prisma.department.findMany({
      where: universityId ? { universityId } : {},
      include: {
        university: { select: { id: true, name: true } },
        _count: { select: { programs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { code_universityId: { code: dto.code, universityId: dto.universityId } },
    });
    if (existing) throw new ConflictException(`Code "${dto.code}" already in use for this university`);

    const dept = await this.prisma.department.create({
      data: dto,
      include: {
        university: { select: { id: true, name: true } },
        _count: { select: { programs: true } },
      },
    });
    await this.prisma.activityLog.create({
      data: { action: 'created', entityType: 'department', entityId: dept.id, entityName: dept.name },
    });
    return dept;
  }

  async updateDepartment(id: number, dto: Partial<CreateDepartmentDto>) {
    await this.findDepartmentOrFail(id);
    const dept = await this.prisma.department.update({
      where: { id },
      data: dto,
      include: {
        university: { select: { id: true, name: true } },
        _count: { select: { programs: true } },
      },
    });
    await this.prisma.activityLog.create({
      data: { action: 'updated', entityType: 'department', entityId: dept.id, entityName: dept.name },
    });
    return dept;
  }

  async deleteDepartment(id: number) {
    const dept = await this.findDepartmentOrFail(id);
    await this.prisma.department.delete({ where: { id } });
    await this.prisma.activityLog.create({
      data: { action: 'deleted', entityType: 'department', entityId: id, entityName: dept.name },
    });
    return { deleted: true };
  }

  private async findDepartmentOrFail(id: number) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException(`Department #${id} not found`);
    return dept;
  }

  // ── Programs ──────────────────────────────────────────────────────────────

  getPrograms(departmentId?: number) {
    return this.prisma.program.findMany({
      where: departmentId ? { departmentId } : {},
      include: {
        department: { include: { university: { select: { id: true, name: true } } } },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProgram(dto: CreateProgramDto) {
    const existing = await this.prisma.program.findUnique({
      where: { code_departmentId: { code: dto.code, departmentId: dto.departmentId } },
    });
    if (existing) throw new ConflictException(`Code "${dto.code}" already in use for this department`);

    const program = await this.prisma.program.create({
      data: dto,
      include: {
        department: { include: { university: { select: { id: true, name: true } } } },
        _count: { select: { sessions: true } },
      },
    });
    await this.prisma.activityLog.create({
      data: { action: 'created', entityType: 'program', entityId: program.id, entityName: program.name },
    });
    return program;
  }

  async updateProgram(id: number, dto: Partial<CreateProgramDto>) {
    await this.findProgramOrFail(id);
    const program = await this.prisma.program.update({
      where: { id },
      data: dto,
      include: {
        department: { include: { university: { select: { id: true, name: true } } } },
        _count: { select: { sessions: true } },
      },
    });
    await this.prisma.activityLog.create({
      data: { action: 'updated', entityType: 'program', entityId: program.id, entityName: program.name },
    });
    return program;
  }

  async deleteProgram(id: number) {
    const program = await this.findProgramOrFail(id);
    await this.prisma.program.delete({ where: { id } });
    await this.prisma.activityLog.create({
      data: { action: 'deleted', entityType: 'program', entityId: id, entityName: program.name },
    });
    return { deleted: true };
  }

  private async findProgramOrFail(id: number) {
    const program = await this.prisma.program.findUnique({ where: { id } });
    if (!program) throw new NotFoundException(`Program #${id} not found`);
    return program;
  }

  // ── User management ──────────────────────────────────────────────────────

  async getUsers(filters: { role?: Role; search?: string; page?: number; limit?: number }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;

    const where: Record<string, unknown> = {};
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      const q = filters.search;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          university: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = items.map((u) => u.id);
    const lastLogins = userIds.length
      ? await this.prisma.auditLog.findMany({
          where: { userId: { in: userIds }, action: 'LOGIN_SUCCESS' },
          orderBy: { createdAt: 'desc' },
          distinct: ['userId'],
          select: { userId: true, createdAt: true },
        })
      : [];
    const lastLoginMap = new Map(lastLogins.map((l) => [l.userId, l.createdAt]));

    return {
      items: items.map((u) => ({ ...u, lastLogin: lastLoginMap.get(u.id) ?? null })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async toggleUserActive(id: number) {
    const user = await this.findUserOrFail(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    await this.prisma.activityLog.create({
      data: {
        action: updated.isActive ? 'activated' : 'suspended',
        entityType: 'user',
        entityId: updated.id,
        entityName: updated.name ?? updated.email,
      },
    });
    return updated;
  }

  async resetUserPassword(id: number) {
    const user = await this.findUserOrFail(id);
    const hashed = await bcrypt.hash('Test@123', BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed, isFirstLogin: true },
    });
    await this.prisma.activityLog.create({
      data: {
        action: 'password reset',
        entityType: 'user',
        entityId: user.id,
        entityName: user.name ?? user.email,
      },
    });
    return { message: 'Password reset to default (Test@123) successfully' };
  }

  async getUserLoginHistory(id: number) {
    await this.findUserOrFail(id);
    return this.prisma.auditLog.findMany({
      where: { userId: id, action: { contains: 'login', mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  private async findUserOrFail(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  // ── Announcements ────────────────────────────────────────────────────────

  getAnnouncements() {
    return this.prisma.announcement.findMany({
      include: { admin: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(createdBy: number, dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.announcement.create({
      data: { title: dto.title, message: dto.message, createdBy },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
    await this.prisma.activityLog.create({
      data: {
        action: 'created',
        entityType: 'announcement',
        entityId: announcement.id,
        entityName: announcement.title,
      },
    });
    return announcement;
  }

  async toggleAnnouncement(id: number) {
    const existing = await this.findAnnouncementOrFail(id);
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    await this.prisma.activityLog.create({
      data: {
        action: updated.isActive ? 'activated' : 'deactivated',
        entityType: 'announcement',
        entityId: updated.id,
        entityName: updated.title,
      },
    });
    return updated;
  }

  async deleteAnnouncement(id: number) {
    const existing = await this.findAnnouncementOrFail(id);
    await this.prisma.announcement.delete({ where: { id } });
    await this.prisma.activityLog.create({
      data: {
        action: 'deleted',
        entityType: 'announcement',
        entityId: id,
        entityName: existing.title,
      },
    });
    return { deleted: true };
  }

  private async findAnnouncementOrFail(id: number) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException(`Announcement #${id} not found`);
    return announcement;
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
