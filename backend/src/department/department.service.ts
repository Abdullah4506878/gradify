import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  findAll() {
    return this.prisma.department.findMany({ include: { university: true, programs: true } });
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { university: true, programs: true },
    });
    if (!department) throw new NotFoundException(`Department #${id} not found`);
    return department;
  }

  async update(id: number, dto: Partial<CreateDepartmentDto>) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.department.delete({ where: { id } });
  }
}
