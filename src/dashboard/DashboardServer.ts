import express, { Application, Request, Response } from 'express';
import * as http from 'http';
import * as path from 'path';
import {
  DashboardConfig,
  SystemStatus,
  MemoryStats,
  SkillStats,
  AgentStats,
} from './types';

export class DashboardServer {
  private app: Application;
  private server: http.Server | null = null;
  private config: DashboardConfig;
  private startTime: Date;

  constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      port: config?.port ?? parseInt(process.env.CAM_DASHBOARD_PORT || '3200', 10),
      host: config?.host ?? '127.0.0.1',
      enabled: config?.enabled ?? true,
      refreshInterval: config?.refreshInterval ?? 30000,
    };

    this.startTime = new Date();
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS for local development
    this.app.use((_req: Request, res: Response, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    this.app.use(express.json());

    // Serve static files from public directory
    const publicDir = path.join(__dirname, 'public');
    this.app.use(express.static(publicDir));
  }

  private setupRoutes(): void {
    this.app.get('/api/health', (_req: Request, res: Response) => {
      const status = this.getSystemStatus();
      res.json({ status: 'ok', data: status });
    });

    this.app.get('/api/memory', (_req: Request, res: Response) => {
      const stats = this.getMemoryStats();
      res.json({ status: 'ok', data: stats });
    });

    this.app.get('/api/skills', (_req: Request, res: Response) => {
      const stats = this.getSkillStats();
      res.json({ status: 'ok', data: stats });
    });

    this.app.get('/api/agents', (_req: Request, res: Response) => {
      const stats = this.getAgentStats();
      res.json({ status: 'ok', data: stats });
    });

    this.app.get('/api/decisions', (_req: Request, res: Response) => {
      const decisions = this.getDecisions();
      res.json({ status: 'ok', data: decisions });
    });

    this.app.get('/api/sessions', (_req: Request, res: Response) => {
      const sessions = this.getSessions();
      res.json({ status: 'ok', data: sessions });
    });

    // Serve index.html for root
    this.app.get('/', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  private getSystemStatus(): SystemStatus {
    return {
      healthy: true,
      model: 'claude-opus-4-5-20251101',
      uptime: Date.now() - this.startTime.getTime(),
      memoryEntries: 0,
      activeSkills: 0,
      activeAgents: 0,
    };
  }

  private getMemoryStats(): MemoryStats {
    return {
      totalEntries: 0,
      byTier: { work: 0, learning: 0, archive: 0, crystal: 0 },
      recentCrystals: 0,
      storageEstimate: '0 KB',
    };
  }

  private getSkillStats(): SkillStats {
    return {
      baselineCount: 0,
      communityCount: 0,
      topPerformers: [],
      gapsDetected: 0,
    };
  }

  private getAgentStats(): AgentStats {
    return {
      totalSpawned: 0,
      activeNow: 0,
      traitEvolutionEntries: 0,
      recentAgents: [],
    };
  }

  private getDecisions(): { timestamp: string; input: string; skill: string; reason: string }[] {
    return [];
  }

  private getSessions(): { id: string; startTime: string; status: string }[] {
    return [];
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        console.log(`CAM Dashboard running at http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  getApp(): Application {
    return this.app;
  }

  getConfig(): DashboardConfig {
    return { ...this.config };
  }
}
