import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AcademicSessionService } from './academic-session.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('academic-sessions')
export class AcademicSessionController {
  constructor(private readonly academicSessionService: AcademicSessionService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateAcademicSessionDto) {
    return this.academicSessionService.create(dto);
  }

  @Get()
  findAll() {
    return this.academicSessionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.academicSessionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateAcademicSessionDto>) {
    return this.academicSessionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.academicSessionService.remove(id);
  }
}
