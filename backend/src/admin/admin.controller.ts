import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { CreateManagerDto } from './dto/create-manager.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ── Universities ──────────────────────────────────────────────────────────

  @Get('universities')
  getUniversities() {
    return this.adminService.getUniversities();
  }

  @Post('universities')
  createUniversity(@Body() dto: CreateUniversityDto) {
    return this.adminService.createUniversity(dto);
  }

  @Put('universities/:id')
  updateUniversity(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateUniversityDto>,
  ) {
    return this.adminService.updateUniversity(id, dto);
  }

  @Delete('universities/:id')
  deleteUniversity(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteUniversity(id);
  }

  // ── Managers — status route BEFORE :id to avoid param collision ───────────

  @Put('managers/:id/status')
  updateManagerStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.updateManagerStatus(id, body.isActive);
  }

  @Get('managers')
  getManagers() {
    return this.adminService.getManagers();
  }

  @Post('managers')
  createManager(@Body() dto: CreateManagerDto) {
    return this.adminService.createManager(dto);
  }

  @Put('managers/:id')
  updateManager(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateManagerDto>,
  ) {
    return this.adminService.updateManager(id, dto);
  }

  @Delete('managers/:id')
  deleteManager(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteManager(id);
  }

  // ── Activity log ──────────────────────────────────────────────────────────

  @Get('activity-log')
  getActivityLog() {
    return this.adminService.getActivityLog();
  }

  // ── System settings ───────────────────────────────────────────────────────

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings/:key')
  updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
  ) {
    return this.adminService.updateSetting(key, value);
  }
}
