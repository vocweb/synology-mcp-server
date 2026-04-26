/**
 * Tests for aggregateTools() feature-flag enforcement.
 * Verifies disabled modules are entirely excluded from tool registration.
 */

import { describe, it, expect } from 'vitest';
import { aggregateTools } from '../../src/tools/index.js';
import type { FeatureFlags } from '../../src/types/index.js';

const ALL_ON: FeatureFlags = {
  drive: true,
  spreadsheet: true,
  mailplus: true,
  calendar: true,
};

const ALL_OFF: FeatureFlags = {
  drive: false,
  spreadsheet: false,
  mailplus: false,
  calendar: false,
};

describe('aggregateTools feature flags', () => {
  it('returns all tools when every feature is enabled', () => {
    const tools = aggregateTools(ALL_ON);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('returns empty array when every feature is disabled', () => {
    const tools = aggregateTools(ALL_OFF);
    expect(tools).toHaveLength(0);
  });

  it('excludes all drive tools when drive=false', () => {
    const tools = aggregateTools({ ...ALL_ON, drive: false });
    const driveTools = tools.filter((t) => t.name.startsWith('drive_'));
    expect(driveTools).toHaveLength(0);
  });

  it('includes drive tools when drive=true', () => {
    const tools = aggregateTools({ ...ALL_OFF, drive: true });
    const driveTools = tools.filter((t) => t.name.startsWith('drive_'));
    expect(driveTools.length).toBeGreaterThan(0);
  });

  it('excludes all spreadsheet tools when spreadsheet=false', () => {
    const tools = aggregateTools({ ...ALL_ON, spreadsheet: false });
    const ssTools = tools.filter((t) => t.name.startsWith('spreadsheet_'));
    expect(ssTools).toHaveLength(0);
  });

  it('excludes all mailplus tools when mailplus=false', () => {
    const tools = aggregateTools({ ...ALL_ON, mailplus: false });
    const mailTools = tools.filter((t) => t.name.startsWith('mailplus_'));
    expect(mailTools).toHaveLength(0);
  });

  it('excludes all calendar tools when calendar=false', () => {
    const tools = aggregateTools({ ...ALL_ON, calendar: false });
    const calTools = tools.filter((t) => t.name.startsWith('calendar_'));
    expect(calTools).toHaveLength(0);
  });

  it('includes only the enabled module when one is on and rest are off', () => {
    const tools = aggregateTools({ ...ALL_OFF, spreadsheet: true });
    expect(tools.length).toBeGreaterThan(0);
    // Every returned tool must belong to spreadsheet
    for (const tool of tools) {
      expect(tool.name).toMatch(/^spreadsheet_/);
    }
  });
});
