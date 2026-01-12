export interface SFTPConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;

  // Paths
  inboundPath: string;      // Where to pick up files
  outboundPath: string;     // Where to drop results
  archivePath: string;      // Where to move processed files
  errorPath?: string;       // Where to move failed files

  // File patterns
  filePattern: string;      // Glob pattern, e.g., "*.csv", "self_pay_*.csv"

  // Processing options
  presetId: string;         // Which mapping preset to use
  autoProcess: boolean;     // Auto-process on pickup
  deleteAfterProcess: boolean; // Delete vs archive

  // Scheduling
  enabled: boolean;
  pollIntervalMinutes: number;
  schedule?: string;        // Cron expression (optional, overrides pollInterval)

  // Organization
  organizationId: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastConnectedAt?: Date;
  lastSyncAt?: Date;
  lastError?: string;
}

export interface SFTPFileInfo {
  name: string;
  path: string;
  size: number;
  modifyTime: Date;
  accessTime: Date;
  isDirectory: boolean;
}

export interface SFTPSyncResult {
  connectionId: string;
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'partial' | 'failed';
  filesFound: number;
  filesProcessed: number;
  filesFailed: number;
  filesSkipped: number;
  errors: Array<{ file: string; error: string }>;
  importIds: string[];
}

export interface SFTPUploadResult {
  success: boolean;
  remotePath: string;
  localPath?: string;
  size: number;
  error?: string;
}
