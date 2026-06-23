import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProgramDto) {
    return this.prisma.program.create({ data: dto });
  }

  findAll() {
    return this.prisma.program.findMany({ include: { department: true, sessions: true } });
  }

  async findOne(id: number) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: { department: true, sessions: true },
    });
    if (!program) throw new NotFoundException(`Program #${id} not found`);
    return program;
  }

  async update(id: number, dto: Partial<CreateProgramDto>) {
    await this.findOne(id);
    return this.prisma.program.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.program.delete({ where: { id } });
  }
}
