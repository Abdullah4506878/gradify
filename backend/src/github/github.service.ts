import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CommitStats {
  commitCount: number;
  lastCommit: Date | null;
  repos: string | null;
}

interface GitHubPushEvent {
  type: string;
  created_at: string;
  repo?: { name: string };
  payload?: { commits?: unknown[] };
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Pulls the username out of a GitHub profile URL (or accepts a bare username/@handle). */
  private extractUsername(githubUrl: string): string | null {
    const trimmed = githubUrl.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed);
      const segment = url.pathname.split('/').filter(Boolean)[0];
      return segment || null;
    } catch {
      return trimmed.replace(/^@/, '') || null;
    }
  }

  /**
   * Fetches a user's public GitHub push activity and reduces it to commit stats
   * for the 7-day window starting at `weekStart`.
   */
  async fetchUserCommits(githubUrl: string, weekStart: Date): Promise<CommitStats> {
    const empty: CommitStats = { commitCount: 0, lastCommit: null, repos: null };

    const username = this.extractUsername(githubUrl);
    if (!username) return empty;

    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    let events: GitHubPushEvent[];
    try {
      const res = await fetch(`https://api.github.com/users/${username}/events?per_page=100`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Gradify-App',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (!res.ok) {
        this.logger.warn(`GitHub API request failed for "${username}": ${res.status} ${res.statusText}`);
        return empty;
      }
      events = (await res.json()) as GitHubPushEvent[];
    } catch (err) {
      this.logger.warn(`GitHub API request errored for "${username}": ${err instanceof Error ? err.message : err}`);
      return empty;
    }

    let commitCount = 0;
    let lastCommit: Date | null = null;
    const repoSet = new Set<string>();

    for (const event of events) {
      if (event.type !== 'PushEvent') continue;
      const createdAt = new Date(event.created_at);
      if (createdAt < weekStart || createdAt >= weekEnd) continue;

      commitCount += event.payload?.commits?.length ?? 0;
      if (!lastCommit || createdAt > lastCommit) lastCommit = createdAt;
      if (event.repo?.name) repoSet.add(event.repo.name);
    }

    return {
      commitCount,
      lastCommit,
      repos: repoSet.size > 0 ? Array.from(repoSet).join(', ') : null,
    };
  }

  /** Last 4 weekly snapshots for a student, most recent first. */
  getStudentCommits(userId: number) {
    return this.prisma.weeklyCommit.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: 4,
    });
  }
}
