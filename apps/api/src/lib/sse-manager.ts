import type { Response } from 'express';

type SseEvent = {
  type: string;
  [key: string]: unknown;
};

class SseManager {
  private readonly clients = new Map<string, Set<Response>>();

  connect(workspaceId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!this.clients.has(workspaceId)) {
      this.clients.set(workspaceId, new Set());
    }
    this.clients.get(workspaceId)!.add(res);

    res.on('close', () => {
      this.clients.get(workspaceId)?.delete(res);
      if (this.clients.get(workspaceId)?.size === 0) {
        this.clients.delete(workspaceId);
      }
    });
  }

  broadcast(workspaceId: string, event: SseEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const set = this.clients.get(workspaceId);
    if (!set) return;
    for (const client of set) {
      client.write(payload);
    }
  }
}

export const sseManager = new SseManager();
