import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubCron } from './github.cron';

@Module({
  controllers: [GithubController],
  providers: [GithubService, GithubCron],
  exports: [GithubService],
})
export class GithubModule {}
