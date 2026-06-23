import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor() {
    const connectionString = 'postgresql://postgres:gradify123@localhost:5432/gradify';
    const adapter = new PrismaPg({ connectionString });
    this.client = new PrismaClient({ adapter });
  }

  get user() {
    return this.client.user;
  }

  get university() {
    return this.client.university;
  }

  get department() {
    return this.client.department;
  }

  get program() {
    return this.client.program;
  }

  get academicSession() {
    return this.client.academicSession;
  }

  get fYPPhase() {
    return this.client.fYPPhase;
  }

  get group() {
    return this.client.group;
  }

  get enrollment() {
    return this.client.enrollment;
  }

  get supervisorPreference() {
    return this.client.supervisorPreference;
  }

  get meetingMinutes() {
    return this.client.meetingMinutes;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}