export interface CustomRule {
  id: string;
  name: string;
  regex: string;
  weight: number;
  enabled: boolean;
}

export interface BehaviorBanConfig {
  dryRun: number; // 1 = log only, 0 = really ban
  authLog: string;
  apacheLogs: string[];
  whitelistFile: string;
  bannedFile: string;
  actionLog: string;
  window: number; // seconds
  banScore: number;
  wSshFail: number;
  wSqli: number;
  w4xx: number;
  w5xx: number;
  w3xx: number;
  sqliRegex: string;
  customRules: CustomRule[];
}

export interface WhitelistEntry {
  id: string;
  ip: string;
  comment: string;
  addedAt: string;
  enabled: boolean;
}

export interface BannedEntry {
  id: string;
  ip: string;
  score: number;
  reason: string;
  bannedAt: string;
  mode: 'dry-run' | 'real';
  status: 'active' | 'unbanned';
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  type: 'DRY-RUN' | 'BANNED' | 'UNBANNED' | 'STARTED' | 'EVENT';
  ip?: string;
  message: string;
  details?: string;
}

export interface SimulatedEvent {
  id: string;
  timestampOffset: number; // seconds from start of simulation
  ip: string;
  type: 'ssh_fail' | 'sqli' | '4xx' | '5xx' | '3xx' | 'custom';
  label: string;
  weight: number;
  rawLine: string;
  details: string;
}

export interface SqliTestVector {
  id: string;
  category: string;
  name: string;
  uri: string;
  expectedMatch: boolean;
  explanation: string;
}
