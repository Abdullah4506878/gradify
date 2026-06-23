import { Injectable, NotFoundException } from '@nestjs/common';
import { Phase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class CreateFypPhaseDto {
  phase: Phase;
  sessionId: number;
}

@Injectable()
export class FypPhaseService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFypPhaseDto) {
    return this.prisma.fYPPhase.create({ data: dto });
  }

  findAll() {
    return this.prisma.fYPPhase.findMany({ include: { session: true } });
  }

  async findOne(id: number) {
    const phase = await this.prisma.fYPPhase.findUnique({
      where: { id },
      include: { session: true },
    });
    if (!phase) throw new NotFoundException(`FYP phase #${id} not found`);
    return phase;
  }

  async update(id: number, dto: Partial<CreateFypPhaseDto>) {
    await this.findOne(id);
    return this.prisma.fYPPhase.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.fYPPhase.delete({ where: { id } });
  }
}
