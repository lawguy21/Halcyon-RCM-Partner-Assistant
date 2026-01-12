import { HalcyonSFTPClient } from './client';
import { SFTPConnectionConfig } from './types';

class SFTPConnectionPool {
  private clients: Map<string, HalcyonSFTPClient> = new Map();
  private configs: Map<string, SFTPConnectionConfig> = new Map();

  registerConnection(config: SFTPConnectionConfig): void {
    this.configs.set(config.id, config);
  }

  unregisterConnection(id: string): void {
    this.configs.delete(id);
    const client = this.clients.get(id);
    if (client) {
      client.disconnect().catch(console.error);
      this.clients.delete(id);
    }
  }

  async getClient(id: string): Promise<HalcyonSFTPClient> {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`SFTP connection ${id} not found`);
    }

    let client = this.clients.get(id);
    if (!client) {
      client = new HalcyonSFTPClient(config);
      await client.connect();
      this.clients.set(id, client);
    }

    return client;
  }

  async releaseClient(id: string): Promise<void> {
    const client = this.clients.get(id);
    if (client) {
      await client.disconnect();
      this.clients.delete(id);
    }
  }

  async releaseAll(): Promise<void> {
    const entries = Array.from(this.clients.entries());
    for (const [id, client] of entries) {
      await client.disconnect();
    }
    this.clients.clear();
  }
}

export const sftpPool = new SFTPConnectionPool();
