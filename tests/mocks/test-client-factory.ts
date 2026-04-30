/**
 * Factory helpers for creating test instances of DriveClient and ToolContext.
 * Provides a pre-configured client pointing at the MSW mock server base URL.
 */

import { DriveClient } from '../../src/clients/drive-client.js';
import { SpreadsheetClient } from '../../src/clients/spreadsheet-client.js';
import { MailPlusClient } from '../../src/clients/mailplus-client.js';
import { CalendarClient } from '../../src/clients/calendar-client.js';
import { AuthManager } from '../../src/auth/auth-manager.js';
import { SpreadsheetAuthManager } from '../../src/auth/spreadsheet-auth-manager.js';
import type { SynologyConfig } from '../../src/types/index.js';
import type { ToolContext } from '../../src/tools/types.js';

/** Minimal SynologyConfig for tests — points at MSW intercepted base URL. */
export const TEST_CONFIG: SynologyConfig = {
  host: 'nas.local',
  port: 5000,
  https: false,
  ignoreCert: false,
  username: 'admin',
  password: 'password',
  tokenTtlMs: 3_600_000,
  requestTimeoutMs: 5_000,
  spreadsheetHost: 'nas.local',
  spreadsheetPort: 3000,
  spreadsheetHttps: false,
  spreadsheetDsmHost: 'nas.local',
  spreadsheetDsmPort: 5000,
  spreadsheetDsmHttps: false,
};

/** Create a DriveClient backed by a real AuthManager (auth is mocked via MSW). */
export function createTestDriveClient(): DriveClient {
  const authManager = new AuthManager(TEST_CONFIG);
  return new DriveClient(TEST_CONFIG, authManager);
}

/** Create a SpreadsheetClient backed by a real SpreadsheetAuthManager (auth is mocked via MSW). */
export function createTestSpreadsheetClient(): SpreadsheetClient {
  const spreadsheetAuthManager = new SpreadsheetAuthManager(TEST_CONFIG);
  return new SpreadsheetClient(TEST_CONFIG, spreadsheetAuthManager);
}

/** Create a MailPlusClient backed by a real AuthManager (auth is mocked via MSW). */
export function createTestMailPlusClient(): MailPlusClient {
  const authManager = new AuthManager(TEST_CONFIG);
  return new MailPlusClient(TEST_CONFIG, authManager);
}

/** Create a CalendarClient backed by a real AuthManager (auth is mocked via MSW). */
export function createTestCalendarClient(): CalendarClient {
  const authManager = new AuthManager(TEST_CONFIG);
  return new CalendarClient(TEST_CONFIG, authManager);
}

/** Create a ToolContext with test Drive, Spreadsheet, MailPlus, and Calendar clients. */
export function createTestContext(): ToolContext {
  return {
    driveClient: createTestDriveClient(),
    spreadsheetClient: createTestSpreadsheetClient(),
    mailplusClient: createTestMailPlusClient(),
    calendarClient: createTestCalendarClient(),
  };
}
