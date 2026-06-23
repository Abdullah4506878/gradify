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
import { CreateFypPhaseDto, FypPhaseService } from './fyp-phase.service';

@UseGuards(JwtAuthGuard)
@Controller('fyp-phases')
export class FypPhaseController {
  constructor(private readonly fypPhaseService: FypPhaseService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateFypPhaseDto) {
    return this.fypPhaseService.create(dto);
  }

  @Get()
  findAll() {
    return this.fypPhaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fypPhaseService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateFypPhaseDto>) {
    return this.fypPhaseService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fypPhaseService.remove(id);
  }
}
