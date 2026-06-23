import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMomDto } from './dto/create-mom.dto';
import { UpdateMomDto } from './dto/update-mom.dto';
import { MomService } from './mom.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('mom')
export class MomController {
  constructor(private readonly momService: MomService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  create(@Req() req: AuthRequest, @Body() dto: CreateMomDto) {
    return this.momService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.momService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.momService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() dto: UpdateMomDto,
  ) {
    return this.momService.update(id, req.user.id, dto);
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  submit(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.momService.submit(id, req.user.id);
  }
}
