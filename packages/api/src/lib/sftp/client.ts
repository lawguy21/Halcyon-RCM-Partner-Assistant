import SftpClient from 'ssh2-sftp-client';
import { SFTPConnectionConfig, SFTPFileInfo, SFTPUploadResult } from './types.js';

export class HalcyonSFTPClient {
  private client: SftpClient;
  private config: SFTPConnectionConfig;
  private connected: boolean = false;

  constructor(config: SFTPConnectionConfig) {
    this.client = new SftpClient();
    this.config = config;
  }

  async connect(): Promise<void> {
    await this.client.connect({
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      privateKey: this.config.privateKey,
      passphrase: this.config.passphrase,
      readyTimeout: 20000,
      retries: 3,
      retry_minTimeout: 2000,
    });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    this.connected = false;
  }

  async listFiles(remotePath?: string): Promise<SFTPFileInfo[]> {
    const path = remotePath || this.config.inboundPath;
    const files = await this.client.list(path, (item) => {
      // Filter by pattern
      return this.matchesPattern(item.name, this.config.filePattern);
    });
    return files.map(f => ({
      name: f.name,
      path: `${path}/${f.name}`,
      size: f.size,
      modifyTime: new Date(f.modifyTime),
      accessTime: new Date(f.accessTime),
      isDirectory: f.type === 'd',
    }));
  }

  async downloadFile(remotePath: string): Promise<Buffer> {
    return await this.client.get(remotePath) as Buffer;
  }

  async downloadFileToLocal(remotePath: string, localPath: string): Promise<void> {
    await this.client.get(remotePath, localPath);
  }

  async uploadFile(localPathOrBuffer: string | Buffer, remotePath: string): Promise<SFTPUploadResult> {
    try {
      await this.client.put(localPathOrBuffer, remotePath);
      const stat = await this.client.stat(remotePath);
      return {
        success: true,
        remotePath,
        size: stat.size,
      };
    } catch (error: any) {
      return {
        success: false,
        remotePath,
        size: 0,
        error: error.message,
      };
    }
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    await this.client.rename(fromPath, toPath);
  }

  async deleteFile(remotePath: string): Promise<void> {
    await this.client.delete(remotePath);
  }

  async ensureDirectory(remotePath: string): Promise<void> {
    const exists = await this.client.exists(remotePath);
    if (!exists) {
      await this.client.mkdir(remotePath, true);
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.connect();
      await this.client.list(this.config.inboundPath);
      return { success: true, latencyMs: Date.now() - start };
    } catch (error: any) {
      return { success: false, error: error.message, latencyMs: Date.now() - start };
    } finally {
      await this.disconnect();
    }
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob matching (*, ?)
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`).test(filename);
  }
}
