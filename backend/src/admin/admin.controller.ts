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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { CreateManagerDto } from './dto/create-manager.dto';
import { CreateDepartmentDto } from '../department/dto/create-department.dto';
import { CreateProgramDto } from '../program/dto/create-program.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

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

  // ── Departments ───────────────────────────────────────────────────────────

  @Get('departments')
  getDepartments(@Query('universityId') universityId?: string) {
    return this.adminService.getDepartments(universityId ? parseInt(universityId, 10) : undefined);
  }

  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.adminService.createDepartment(dto);
  }

  @Put('departments/:id')
  updateDepartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateDepartmentDto>,
  ) {
    return this.adminService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  deleteDepartment(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteDepartment(id);
  }

  // ── Programs ──────────────────────────────────────────────────────────────

  @Get('programs')
  getPrograms(@Query('departmentId') departmentId?: string) {
    return this.adminService.getPrograms(departmentId ? parseInt(departmentId, 10) : undefined);
  }

  @Post('programs')
  createProgram(@Body() dto: CreateProgramDto) {
    return this.adminService.createProgram(dto);
  }

  @Put('programs/:id')
  updateProgram(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateProgramDto>,
  ) {
    return this.adminService.updateProgram(id, dto);
  }

  @Delete('programs/:id')
  deleteProgram(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteProgram(id);
  }

  // ── User management ──────────────────────────────────────────────────────

  @Get('users')
  getUsers(
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      role,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('users/:id/suspend')
  toggleUserActive(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleUserActive(id);
  }

  @Patch('users/:id/reset-password')
  resetUserPassword(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.resetUserPassword(id);
  }

  @Get('users/:id/login-history')
  getUserLoginHistory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserLoginHistory(id);
  }

  // ── Announcements ────────────────────────────────────────────────────────

  @Get('announcements')
  getAnnouncements() {
    return this.adminService.getAnnouncements();
  }

  @Post('announcements')
  createAnnouncement(@Req() req: AuthRequest, @Body() dto: CreateAnnouncementDto) {
    return this.adminService.createAnnouncement(req.user.id, dto);
  }

  @Patch('announcements/:id/toggle')
  toggleAnnouncement(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleAnnouncement(id);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAnnouncement(id);
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
