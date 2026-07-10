import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Phase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';

@Injectable()
export class AcademicSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAcademicSessionDto) {
    const { semester, year, programId } = dto;
    const name = `${semester} ${year}`;
    return this.prisma.academicSession.create({
      data: { name, semester, year, programId },
      include: { program: true, phases: true },
    });
  }

  findAll() {
    return this.prisma.academicSession.findMany({
      include: { program: true, phases: true },
      orderBy: [{ year: 'desc' }, { semester: 'asc' }],
    });
  }

  async findOne(id: number) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id },
      include: { program: true, phases: true },
    });
    if (!session) throw new NotFoundException(`Academic session #${id} not found`);
    return session;
  }

  async update(id: number, dto: Partial<CreateAcademicSessionDto>) {
    await this.findOne(id);
    return this.prisma.academicSession.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.academicSession.delete({ where: { id } });
  }

  async toggleActive(id: number) {
    const session = await this.findOne(id);
    return this.prisma.academicSession.update({
      where: { id },
      data: { isActive: !session.isActive },
      include: { program: true, phases: true },
    });
  }

  async addPhase(sessionId: number, phase: Phase) {
    await this.findOne(sessionId);
    const existing = await this.prisma.fYPPhase.findUnique({
      where: { phase_sessionId: { phase, sessionId } },
    });
    if (existing) throw new ConflictException(`${phase} already exists for this session`);
    return this.prisma.fYPPhase.create({ data: { phase, sessionId } });
  }

  async getActiveSession() {
    const session = await this.prisma.academicSession.findFirst({
      where: { isActive: true },
      include: { phases: true, program: true },
    });
    if (!session) throw new BadRequestException('No active academic session. Please contact admin.');
    return session;
  }

  async removePhase(sessionId: number, phaseId: number) {
    const phase = await this.prisma.fYPPhase.findFirst({
      where: { id: phaseId, sessionId },
    });
    if (!phase) throw new NotFoundException(`Phase #${phaseId} not found in session #${sessionId}`);
    return this.prisma.fYPPhase.delete({ where: { id: phaseId } });
  }
}
