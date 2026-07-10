import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_KEYS = ['show_supervisor_to_student', 'show_group_to_supervisor', 'fyp_phase', 'show_phase_to_students'];

@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('public')
  async getPublicSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }
}
