import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ValidationError } from '../src/errors.js';

/** Minimal valid env vars required by the schema */
const VALID_ENV: Record<string, string> = {
  SYNO_HOST: '192.168.1.100',
  SYNO_PORT: '5001',
  SYNO_HTTPS: 'true',
  SYNO_IGNORE_CERT: 'true',
  SYNO_USERNAME: 'admin',
  SYNO_PASSWORD: 'secret',
};

/** Saves original env, patches it, restores on teardown */
function withEnv(overrides: Record<string, string | undefined>): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
  }
  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
  return () => {
    for (const [key, val] of Object.entries(saved)) {
      if (val === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  };
}

describe('loadConfig', () => {
  // Clear SYNO_* and MCP_* from the real env before each test so CI env
  // variables don't interfere with validation tests.
  const MANAGED_KEYS = [
    'SYNO_HOST',
    'SYNO_PORT',
    'SYNO_HTTPS',
    'SYNO_IGNORE_CERT',
    'SYNO_USERNAME',
    'SYNO_PASSWORD',
    'SYNO_OTP_CODE',
    'SYNO_TOKEN_TTL_MS',
    'SYNO_REQUEST_TIMEOUT_MS',
    'SYNO_ENABLE_DRIVE',
    'SYNO_ENABLE_SPREADSHEET',
    'SYNO_ENABLE_MAILPLUS',
    'SYNO_ENABLE_CALENDAR',
    'MCP_TRANSPORT',
    'MCP_SSE_PORT',
    'MCP_SSE_HOST',
    'MCP_AUTH_TOKEN',
    'LOG_LEVEL',
    'LOG_FILE',
  ];
  let restoreEnv: () => void;

  beforeEach(() => {
    // Remove all managed keys so each test starts clean
    const blanked = Object.fromEntries(MANAGED_KEYS.map((k) => [k, undefined]));
    restoreEnv = withEnv(blanked);
  });

  afterEach(() => {
    restoreEnv();
  });

  it('returns typed AppConfig for valid env', async () => {
    const restore = withEnv(VALID_ENV);
    try {
      // Dynamic import ensures module re-evaluates with current process.env
      const { loadConfig } = await import('../src/config.js?v=valid');
      const cfg = loadConfig();
      expect(cfg.synology.host).toBe('192.168.1.100');
      expect(cfg.synology.port).toBe(5001);
      expect(cfg.synology.https).toBe(true);
      expect(cfg.synology.username).toBe('admin');
      expect(cfg.mcp.transport).toBe('stdio');
      expect(cfg.features.drive).toBe(true);
      expect(cfg.logLevel).toBe('info');
    } finally {
      restore();
    }
  });

  it('throws ValidationError when SYNO_HOST is missing', async () => {
    const env = { ...VALID_ENV };
    delete (env as Partial<typeof env>).SYNO_HOST;
    const restore = withEnv(env);
    try {
      const { loadConfig } = await import('../src/config.js?v=no-host');
      expect(() => loadConfig()).toThrow(ValidationError);
    } finally {
      restore();
    }
  });

  it('throws ValidationError when SYNO_USERNAME is missing', async () => {
    const env = { ...VALID_ENV };
    delete (env as Partial<typeof env>).SYNO_USERNAME;
    const restore = withEnv(env);
    try {
      const { loadConfig } = await import('../src/config.js?v=no-user');
      expect(() => loadConfig()).toThrow(ValidationError);
    } finally {
      restore();
    }
  });

  it('throws ValidationError when SYNO_PASSWORD is missing', async () => {
    const env = { ...VALID_ENV };
    delete (env as Partial<typeof env>).SYNO_PASSWORD;
    const restore = withEnv(env);
    try {
      const { loadConfig } = await import('../src/config.js?v=no-pass');
      expect(() => loadConfig()).toThrow(ValidationError);
    } finally {
      restore();
    }
  });

  it('applies default values for optional vars', async () => {
    const restore = withEnv(VALID_ENV);
    try {
      const { loadConfig } = await import('../src/config.js?v=defaults');
      const cfg = loadConfig();
      expect(cfg.synology.tokenTtlMs).toBe(82_800_000);
      expect(cfg.synology.requestTimeoutMs).toBe(30_000);
      expect(cfg.mcp.ssePort).toBe(3100);
      expect(cfg.mcp.sseHost).toBe('127.0.0.1');
    } finally {
      restore();
    }
  });

  it('respects MCP_TRANSPORT=sse override', async () => {
    const restore = withEnv({ ...VALID_ENV, MCP_TRANSPORT: 'sse' });
    try {
      const { loadConfig } = await import('../src/config.js?v=sse');
      const cfg = loadConfig();
      expect(cfg.mcp.transport).toBe('sse');
    } finally {
      restore();
    }
  });

  it('defaults SYNO_IGNORE_CERT to false (secure-by-default)', async () => {
    const env = { ...VALID_ENV };
    delete (env as Partial<typeof env>).SYNO_IGNORE_CERT;
    const restore = withEnv(env);
    try {
      const { loadConfig } = await import('../src/config.js?v=cert-default');
      const cfg = loadConfig();
      expect(cfg.synology.ignoreCert).toBe(false);
    } finally {
      restore();
    }
  });

  it('rejects SSE on non-loopback host without MCP_AUTH_TOKEN', async () => {
    const restore = withEnv({
      ...VALID_ENV,
      MCP_TRANSPORT: 'sse',
      MCP_SSE_HOST: '0.0.0.0',
    });
    try {
      const { loadConfig } = await import('../src/config.js?v=sse-no-token');
      expect(() => loadConfig()).toThrow(ValidationError);
    } finally {
      restore();
    }
  });

  it('allows SSE on non-loopback host when MCP_AUTH_TOKEN is set', async () => {
    const restore = withEnv({
      ...VALID_ENV,
      MCP_TRANSPORT: 'sse',
      MCP_SSE_HOST: '0.0.0.0',
      MCP_AUTH_TOKEN: 'strong-shared-secret',
    });
    try {
      const { loadConfig } = await import('../src/config.js?v=sse-with-token');
      const cfg = loadConfig();
      expect(cfg.mcp.sseHost).toBe('0.0.0.0');
      expect(cfg.mcp.authToken).toBe('strong-shared-secret');
    } finally {
      restore();
    }
  });

  it('allows SSE on loopback host without MCP_AUTH_TOKEN', async () => {
    const restore = withEnv({
      ...VALID_ENV,
      MCP_TRANSPORT: 'sse',
      MCP_SSE_HOST: '127.0.0.1',
    });
    try {
      const { loadConfig } = await import('../src/config.js?v=sse-loopback');
      const cfg = loadConfig();
      expect(cfg.mcp.transport).toBe('sse');
    } finally {
      restore();
    }
  });
});
