/**
 * Tests for datetime-convert utility: isoToUnixSeconds and unixSecondsToIso.
 * Covers: Z suffix, ±HH:MM offset, date-only, local datetime, DST boundary, invalid input.
 */

import { describe, it, expect } from 'vitest';
import { isoToUnixSeconds, unixSecondsToIso } from '../../src/utils/datetime-convert.js';

describe('isoToUnixSeconds', () => {
  it('parses UTC ISO with Z suffix', () => {
    const result = isoToUnixSeconds('2024-01-15T09:00:00Z');
    // 2024-01-15T09:00:00Z in unix seconds
    expect(result).toBe(Math.floor(Date.parse('2024-01-15T09:00:00Z') / 1000));
  });

  it('parses ISO with positive offset', () => {
    const result = isoToUnixSeconds('2024-01-15T14:30:00+05:30');
    expect(result).toBe(Math.floor(Date.parse('2024-01-15T14:30:00+05:30') / 1000));
  });

  it('parses ISO with negative offset', () => {
    const result = isoToUnixSeconds('2024-01-15T04:00:00-05:00');
    expect(result).toBe(Math.floor(Date.parse('2024-01-15T04:00:00-05:00') / 1000));
  });

  it('parses date-only as midnight local time (no Z appended)', () => {
    // "2024-03-15" should become "2024-03-15T00:00:00" (local, no offset)
    const expected = Math.floor(Date.parse('2024-03-15T00:00:00') / 1000);
    expect(isoToUnixSeconds('2024-03-15')).toBe(expected);
  });

  it('parses local datetime without offset', () => {
    const expected = Math.floor(Date.parse('2024-06-21T12:00:00') / 1000);
    expect(isoToUnixSeconds('2024-06-21T12:00:00')).toBe(expected);
  });

  it('parses DST boundary in summer (Z offset — unambiguous)', () => {
    // DST-aware: 2024-03-31T01:00:00Z is just before EU DST spring-forward
    const result = isoToUnixSeconds('2024-03-31T01:00:00Z');
    expect(result).toBe(Math.floor(Date.parse('2024-03-31T01:00:00Z') / 1000));
  });

  it('produces integer seconds (floor, no decimals)', () => {
    const result = isoToUnixSeconds('2024-01-01T00:00:00Z');
    expect(Number.isInteger(result)).toBe(true);
  });

  it('throws on invalid ISO string', () => {
    expect(() => isoToUnixSeconds('not-a-date')).toThrow();
    expect(() => isoToUnixSeconds('')).toThrow();
    expect(() => isoToUnixSeconds('2024-13-01')).toThrow();
  });
});

describe('unixSecondsToIso', () => {
  it('converts unix seconds to ISO 8601 UTC string', () => {
    const iso = unixSecondsToIso(1700000000);
    expect(iso).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('returned string ends with Z', () => {
    expect(unixSecondsToIso(0)).toMatch(/Z$/);
  });

  it('round-trips with isoToUnixSeconds for UTC input', () => {
    const original = '2024-06-15T10:30:00.000Z';
    const unix = isoToUnixSeconds(original);
    expect(unixSecondsToIso(unix)).toBe(original);
  });

  it('handles zero (Unix epoch)', () => {
    expect(unixSecondsToIso(0)).toBe('1970-01-01T00:00:00.000Z');
  });
});
