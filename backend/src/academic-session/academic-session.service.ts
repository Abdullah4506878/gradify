import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';

@Injectable()
export class AcademicSessionService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAcademicSessionDto) {
    return this.prisma.academicSession.create({ data: dto });
  }

  findAll() {
    return this.prisma.academicSession.findMany({ include: { program: true, phases: true } });
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
}
