import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMeDto, UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: AuthRequest) {
    return this.usersService.findMe(req.user.id);
  }

  @Patch('me')
  updateMe(@Req() req: AuthRequest, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  findAll(
    @Query('role') role?: Role,
    @Query('universityId') universityId?: string,
  ) {
    return this.usersService.findAll({
      role,
      universityId: universityId ? parseInt(universityId, 10) : undefined,
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findMe(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeUser(id);
  }
}
