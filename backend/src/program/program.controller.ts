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
import { CreateProgramDto } from './dto/create-program.dto';
import { ProgramService } from './program.service';

@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateProgramDto) {
    return this.programService.create(dto);
  }

  @Get()
  findAll() {
    return this.programService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.programService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateProgramDto>) {
    return this.programService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.programService.remove(id);
  }
}
