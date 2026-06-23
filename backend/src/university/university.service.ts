import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUniversityDto } from './dto/create-university.dto';

@Injectable()
export class UniversityService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateUniversityDto) {
    return this.prisma.university.create({ data: dto });
  }

  findAll() {
    return this.prisma.university.findMany({ include: { departments: true } });
  }

  async findOne(id: number) {
    const university = await this.prisma.university.findUnique({
      where: { id },
      include: { departments: true },
    });
    if (!university) throw new NotFoundException(`University #${id} not found`);
    return university;
  }

  async update(id: number, dto: Partial<CreateUniversityDto>) {
    await this.findOne(id);
    return this.prisma.university.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.university.delete({ where: { id } });
  }
}
