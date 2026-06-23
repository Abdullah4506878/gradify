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
import { CreateUniversityDto } from './dto/create-university.dto';
import { UniversityService } from './university.service';

@UseGuards(JwtAuthGuard)
@Controller('universities')
export class UniversityController {
  constructor(private readonly universityService: UniversityService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateUniversityDto) {
    return this.universityService.create(dto);
  }

  @Get()
  findAll() {
    return this.universityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.universityService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateUniversityDto>) {
    return this.universityService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.universityService.remove(id);
  }
}
