/**
 * Tests for prompts/index.ts — list(), get() for all three prompts.
 */

import { describe, it, expect } from 'vitest';
import { list, get } from '../../src/prompts/index.js';

// ---------------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------------

describe('prompts list()', () => {
  it('returns exactly 3 prompts', () => {
    const { prompts } = list();
    expect(prompts).toHaveLength(3);
  });

  it('includes summarize-spreadsheet', () => {
    const { prompts } = list();
    const names = prompts.map((p) => p.name);
    expect(names).toContain('summarize-spreadsheet');
  });

  it('includes draft-email-from-spreadsheet', () => {
    const { prompts } = list();
    const names = prompts.map((p) => p.name);
    expect(names).toContain('draft-email-from-spreadsheet');
  });

  it('includes schedule-from-list', () => {
    const { prompts } = list();
    const names = prompts.map((p) => p.name);
    expect(names).toContain('schedule-from-list');
  });

  it('every prompt has name, description, and arguments array', () => {
    const { prompts } = list();
    for (const p of prompts) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(Array.isArray(p.arguments)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// get() — summarize-spreadsheet
// ---------------------------------------------------------------------------

describe('prompts get() — summarize-spreadsheet', () => {
  it('returns messages array with user role', () => {
    const result = get('summarize-spreadsheet', { file_id: 'file_abc' });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe('user');
  });

  it('includes file_id in generated text', () => {
    const result = get('summarize-spreadsheet', { file_id: 'my_file_123' });
    expect(result.messages[0]?.content.text).toContain('my_file_123');
  });

  it('includes sheet_name when provided', () => {
    const result = get('summarize-spreadsheet', { file_id: 'f1', sheet_name: 'Q1 Sales' });
    expect(result.messages[0]?.content.text).toContain('Q1 Sales');
  });

  it('includes focus insight when provided', () => {
    const result = get('summarize-spreadsheet', { file_id: 'f1', focus: 'revenue anomalies' });
    expect(result.messages[0]?.content.text).toContain('revenue anomalies');
  });

  it('uses default sheet label when sheet_name absent', () => {
    const result = get('summarize-spreadsheet', { file_id: 'f1' });
    expect(result.messages[0]?.content.text).toContain('first sheet');
  });
});

// ---------------------------------------------------------------------------
// get() — draft-email-from-spreadsheet
// ---------------------------------------------------------------------------

describe('prompts get() — draft-email-from-spreadsheet', () => {
  it('returns messages array', () => {
    const result = get('draft-email-from-spreadsheet', {
      file_id: 'f2',
      sheet_name: 'Contacts',
      row_number: '5',
      recipient_column: 'Email',
    });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe('user');
  });

  it('mentions recipient_column in text', () => {
    const result = get('draft-email-from-spreadsheet', {
      file_id: 'f2',
      sheet_name: 'Contacts',
      row_number: '3',
      recipient_column: 'EmailAddress',
    });
    expect(result.messages[0]?.content.text).toContain('EmailAddress');
  });

  it('includes template when provided', () => {
    const result = get('draft-email-from-spreadsheet', {
      file_id: 'f2',
      sheet_name: 'Contacts',
      row_number: '3',
      recipient_column: 'Email',
      template: 'Dear {Name},',
    });
    expect(result.messages[0]?.content.text).toContain('Dear {Name},');
  });
});

// ---------------------------------------------------------------------------
// get() — schedule-from-list
// ---------------------------------------------------------------------------

describe('prompts get() — schedule-from-list', () => {
  it('returns messages array', () => {
    const result = get('schedule-from-list', {
      file_id: 'f3',
      sheet_name: 'Events',
      calendar_id: 'cal1',
      title_column: 'Title',
      date_column: 'Date',
    });
    expect(result.messages).toHaveLength(1);
  });

  it('includes calendar_id in text', () => {
    const result = get('schedule-from-list', {
      file_id: 'f3',
      sheet_name: 'Events',
      calendar_id: 'my_calendar_id',
      title_column: 'Title',
      date_column: 'Date',
    });
    expect(result.messages[0]?.content.text).toContain('my_calendar_id');
  });

  it('includes description_column when provided', () => {
    const result = get('schedule-from-list', {
      file_id: 'f3',
      sheet_name: 'Events',
      calendar_id: 'cal1',
      title_column: 'Title',
      date_column: 'Date',
      description_column: 'Notes',
    });
    expect(result.messages[0]?.content.text).toContain('Notes');
  });
});

// ---------------------------------------------------------------------------
// get() — unknown prompt
// ---------------------------------------------------------------------------

describe('prompts get() — error handling', () => {
  it('throws for unknown prompt name', () => {
    expect(() => get('nonexistent-prompt', {})).toThrow('Unknown prompt');
  });
});
