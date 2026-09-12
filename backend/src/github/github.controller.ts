import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GithubService } from './github.service';

@UseGuards(JwtAuthGuard)
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('student/:userId/commits')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.SUPERVISOR)
  getStudentCommits(@Param('userId', ParseIntPipe) userId: number) {
    return this.githubService.getStudentCommits(userId);
  }
}
