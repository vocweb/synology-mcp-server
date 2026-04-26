/**
 * Configuration type definitions for synology-office-mcp.
 * All interfaces correspond to spec §11 environment variables.
 */

/** Synology NAS connection and auth settings */
export interface SynologyConfig {
  /** NAS hostname or IP address */
  host: string;
  /** NAS port (5000=HTTP, 5001=HTTPS) */
  port: number;
  /** Use HTTPS when true */
  https: boolean;
  /** Skip TLS certificate validation (for self-signed certs) */
  ignoreCert: boolean;
  /** DSM account username */
  username: string;
  /** DSM account password */
  password: string;
  /** Optional OTP code for 2FA accounts */
  otpCode?: string;
  /** Session token TTL in milliseconds (default 23h = 82800000) */
  tokenTtlMs: number;
  /** HTTP request timeout in milliseconds (default 30000) */
  requestTimeoutMs: number;
}

/** MCP server transport configuration */
export interface McpConfig {
  /** Transport mode: stdio for CLI, sse for multi-client */
  transport: 'stdio' | 'sse';
  /** SSE server port, only used when transport=sse */
  ssePort: number;
  /** SSE bind host, defaults to 127.0.0.1 */
  sseHost: string;
  /** Optional shared secret for SSE mode authentication */
  authToken?: string;
}

/** Feature flags controlling which Synology modules are active */
export interface FeatureFlags {
  /** Enable Synology Drive tools */
  drive: boolean;
  /** Enable Synology Spreadsheet tools */
  spreadsheet: boolean;
  /** Enable Synology MailPlus tools */
  mailplus: boolean;
  /** Enable Synology Calendar tools */
  calendar: boolean;
}

/** Root application configuration assembled from environment */
export interface AppConfig {
  /** Synology NAS connection settings */
  synology: SynologyConfig;
  /** MCP transport settings */
  mcp: McpConfig;
  /** Feature toggles per module */
  features: FeatureFlags;
  /** Log verbosity level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Optional log file path; logs to stderr only if absent */
  logFile?: string;
}
