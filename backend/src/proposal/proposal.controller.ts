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
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ManagerReviewProposalDto, ReviewProposalDto } from './dto/review-proposal.dto';
import { ProposalService } from './proposal.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('proposals')
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  create(@Body() dto: CreateProposalDto) {
    return this.proposalService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.SUPERVISOR)
  findAll() {
    return this.proposalService.findAll();
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  findMy(@Req() req: AuthRequest) {
    return this.proposalService.findMyProposal(req.user.id);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.MANAGER)
  review(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() dto: ReviewProposalDto,
  ) {
    return this.proposalService.review(id, req.user.id, req.user.role, dto);
  }

  @Patch(':id/manager-review')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  managerReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManagerReviewProposalDto,
  ) {
    return this.proposalService.managerReview(id, dto);
  }
}
