/**
 * Environment-based configuration loader with Zod validation.
 * Call loadConfig() once at startup; it throws ValidationError on bad input.
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import type { AppConfig } from './types/index.js';
import { ValidationError } from './errors.js';

// Load .env file into process.env (no-op if file absent; env vars already set win).
// Tests set DOTENV_CONFIG_PATH=/dev/null to prevent the developer's local `.env`
// from leaking into the test environment.
dotenvConfig(process.env.DOTENV_CONFIG_PATH ? { path: process.env.DOTENV_CONFIG_PATH } : undefined);

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

/** Coerces "true"/"false" strings (common in .env files) to boolean */
const envBool = (
  defaultVal: boolean,
): z.ZodEffects<
  z.ZodUnion<[z.ZodString, z.ZodBoolean, z.ZodUndefined]>,
  boolean,
  string | boolean | undefined
> =>
  z.union([z.string(), z.boolean(), z.undefined()]).transform((v): boolean => {
    if (v === undefined || v === '') return defaultVal;
    if (typeof v === 'boolean') return v;
    return v.trim().toLowerCase() === 'true';
  });

/** Coerces numeric strings to number */
const envInt = (
  defaultVal: number,
): z.ZodEffects<
  z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodUndefined]>,
  number,
  string | number | undefined
> =>
  z.union([z.string(), z.number(), z.undefined()]).transform((v): number => {
    if (v === undefined || v === '') return defaultVal;
    if (typeof v === 'number') return v;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? defaultVal : n;
  });

const AppConfigSchema = z.object({
  // Synology NAS connection
  SYNO_HOST: z.string().trim().min(1, 'SYNO_HOST is required'),
  SYNO_PORT: envInt(5001),
  SYNO_HTTPS: envBool(true),
  // Secure-by-default: TLS verification ON. Users with self-signed home NAS
  // certs must explicitly opt-out via SYNO_IGNORE_CERT=true.
  SYNO_IGNORE_CERT: envBool(false),
  SYNO_USERNAME: z.string().trim().min(1, 'SYNO_USERNAME is required'),
  SYNO_PASSWORD: z.string().min(1, 'SYNO_PASSWORD is required'),
  SYNO_OTP_CODE: z.string().optional(),
  SYNO_TOKEN_TTL_MS: envInt(82_800_000), // 23 hours
  SYNO_REQUEST_TIMEOUT_MS: envInt(30_000),

  // Synology Spreadsheet API (v3.7+ REST API, separate Docker container)
  SYNO_SPREADSHEET_PORT: envInt(3000),
  SYNO_SPREADSHEET_HTTPS: envBool(false),

  // Feature flags
  SYNO_ENABLE_DRIVE: envBool(true),
  SYNO_ENABLE_SPREADSHEET: envBool(true),
  SYNO_ENABLE_MAILPLUS: envBool(true),
  SYNO_ENABLE_CALENDAR: envBool(true),

  // MCP transport
  MCP_TRANSPORT: z
    .string()
    .optional()
    .transform((v): 'stdio' | 'sse' => {
      if (v === undefined || v === '') return 'stdio';
      if (v === 'stdio' || v === 'sse') return v;
      throw new Error(`MCP_TRANSPORT must be 'stdio' or 'sse', got '${v}'`);
    }),
  MCP_SSE_PORT: envInt(3100),
  MCP_SSE_HOST: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === '' ? '127.0.0.1' : v)),
  MCP_AUTH_TOKEN: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .string()
    .optional()
    .transform((v): 'debug' | 'info' | 'warn' | 'error' => {
      if (v === undefined || v === '') return 'info';
      if (v === 'debug' || v === 'info' || v === 'warn' || v === 'error') return v;
      throw new Error(`LOG_LEVEL must be one of debug|info|warn|error, got '${v}'`);
    }),
  LOG_FILE: z.string().optional(),
});

/**
 * Returns true when `host` resolves to a loopback bind: IPv4 127.0.0.0/8,
 * IPv6 ::1, or the literal "localhost". Used to gate SSE auth requirement.
 */
function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === 'localhost' || h === '::1' || h === '[::1]') return true;
  // IPv4 loopback range 127.0.0.0/8
  return /^127(\.\d{1,3}){3}$/.test(h);
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Parses `process.env` through the Zod schema and returns a typed AppConfig.
 *
 * @returns Fully validated application configuration.
 * @throws {ValidationError} When required variables are missing or values are invalid.
 */
export function loadConfig(): AppConfig {
  const result = AppConfigSchema.safeParse(process.env);

  if (!result.success) {
    // Collect all issues into a single readable message
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new ValidationError('CONFIG_INVALID', `Configuration validation failed:\n${issues}`);
  }

  const env = result.data;

  // SSE bound to non-loopback without an auth token = unauthenticated proxy
  // to the NAS session. Reject at startup per MCP spec security guidance.
  if (env.MCP_TRANSPORT === 'sse' && !isLoopbackHost(env.MCP_SSE_HOST) && !env.MCP_AUTH_TOKEN) {
    throw new ValidationError(
      'SSE_AUTH_REQUIRED',
      `MCP_AUTH_TOKEN is required when MCP_SSE_HOST is not a loopback address (got '${env.MCP_SSE_HOST}'). ` +
        'Either set MCP_AUTH_TOKEN to a strong shared secret or bind to 127.0.0.1.',
    );
  }

  return {
    synology: {
      host: env.SYNO_HOST,
      port: env.SYNO_PORT,
      https: env.SYNO_HTTPS,
      ignoreCert: env.SYNO_IGNORE_CERT,
      username: env.SYNO_USERNAME,
      password: env.SYNO_PASSWORD,
      ...(env.SYNO_OTP_CODE ? { otpCode: env.SYNO_OTP_CODE } : {}),
      tokenTtlMs: env.SYNO_TOKEN_TTL_MS,
      requestTimeoutMs: env.SYNO_REQUEST_TIMEOUT_MS,
      spreadsheetPort: env.SYNO_SPREADSHEET_PORT,
      spreadsheetHttps: env.SYNO_SPREADSHEET_HTTPS,
    },
    mcp: {
      transport: env.MCP_TRANSPORT,
      ssePort: env.MCP_SSE_PORT,
      sseHost: env.MCP_SSE_HOST,
      ...(env.MCP_AUTH_TOKEN ? { authToken: env.MCP_AUTH_TOKEN } : {}),
    },
    features: {
      drive: env.SYNO_ENABLE_DRIVE,
      spreadsheet: env.SYNO_ENABLE_SPREADSHEET,
      mailplus: env.SYNO_ENABLE_MAILPLUS,
      calendar: env.SYNO_ENABLE_CALENDAR,
    },
    logLevel: env.LOG_LEVEL,
    ...(env.LOG_FILE ? { logFile: env.LOG_FILE } : {}),
  };
}
