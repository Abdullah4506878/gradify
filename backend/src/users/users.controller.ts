import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { memoryStorage } from 'multer';
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
  @Roles(Role.MANAGER, Role.SUPERVISOR, Role.STUDENT)
  findAll(
    @Query('role') role?: Role,
    @Query('universityId') universityId?: string,
  ) {
    return this.usersService.findAll({
      role,
      universityId: universityId ? parseInt(universityId, 10) : undefined,
    });
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed =
          file.originalname.match(/\.(csv|xlsx)$/i) ||
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!allowed) {
          return cb(new BadRequestException('Only .csv and .xlsx files are accepted'), false);
        }
        cb(null, true);
      },
    }),
  )
  importUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.usersService.importFromFile(file.buffer, file.mimetype, file.originalname);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch('supervisors/workload-bulk')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  updateWorkloadBulk(@Body('maxGroups') maxGroups: number) {
    return this.usersService.updateWorkloadBulk(Number(maxGroups));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findMe(id);
  }

  @Patch(':id/workload')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  updateWorkload(
    @Param('id', ParseIntPipe) id: number,
    @Body('maxGroups') maxGroups: number,
  ) {
    return this.usersService.updateWorkload(id, Number(maxGroups));
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
