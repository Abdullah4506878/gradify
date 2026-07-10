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
import { Phase, Role } from '@prisma/client';
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
  @Roles(Role.SUPER_ADMIN)
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
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateAcademicSessionDto>) {
    return this.academicSessionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.academicSessionService.remove(id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.academicSessionService.toggleActive(id);
  }

  @Post(':id/phases')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  addPhase(@Param('id', ParseIntPipe) id: number, @Body() body: { phase: Phase }) {
    return this.academicSessionService.addPhase(id, body.phase);
  }

  @Delete(':id/phases/:phaseId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  removePhase(
    @Param('id', ParseIntPipe) id: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
  ) {
    return this.academicSessionService.removePhase(id, phaseId);
  }
}
