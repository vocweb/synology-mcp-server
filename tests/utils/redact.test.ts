import { describe, it, expect } from 'vitest';
import { redactSensitive } from '../../src/utils/redact.js';

describe('redactSensitive', () => {
  it('redacts top-level sensitive keys', () => {
    const input = { username: 'admin', password: 'secret', port: 5001 };
    const result = redactSensitive(input) as Record<string, unknown>;
    expect(result['password']).toBe('[REDACTED]');
    expect(result['username']).toBe('admin');
    expect(result['port']).toBe(5001);
  });

  it('redacts all listed sensitive keys', () => {
    const input = {
      password: 'p',
      passwd: 'p',
      sid: 's',
      _sid: 's',
      did: 'd',
      token: 't',
      otp: 'o',
      otp_code: 'o',
      authorization: 'Bearer x',
      cookie: 'id=abc',
      'set-cookie': 'id=abc',
      secret: 's',
      apikey: 'k',
      api_key: 'k',
      bearer: 'b',
      mcp_auth_token: 'm',
      auth_token: 'a',
      synotoken: 'x',
    };
    const result = redactSensitive(input) as Record<string, unknown>;
    for (const key of Object.keys(input)) {
      expect(result[key]).toBe('[REDACTED]');
    }
  });

  it('matches sensitive keys case-insensitively', () => {
    const input = { Cookie: 'id=abc', AUTHORIZATION: 'Bearer x', SynoToken: 't' };
    const result = redactSensitive(input) as Record<string, unknown>;
    expect(result['Cookie']).toBe('[REDACTED]');
    expect(result['AUTHORIZATION']).toBe('[REDACTED]');
    expect(result['SynoToken']).toBe('[REDACTED]');
  });

  it('redacts nested objects recursively', () => {
    const input = { outer: { inner: { password: 'deep' }, safe: 'ok' } };
    const result = redactSensitive(input) as {
      outer: { inner: { password: string }; safe: string };
    };
    expect(result.outer.inner.password).toBe('[REDACTED]');
    expect(result.outer.safe).toBe('ok');
  });

  it('redacts sensitive keys inside arrays of objects', () => {
    const input = [{ sid: 'abc' }, { name: 'alice' }];
    const result = redactSensitive(input) as Array<Record<string, unknown>>;
    expect(result[0]?.['sid']).toBe('[REDACTED]');
    expect(result[1]?.['name']).toBe('alice');
  });

  it('does not mutate the original object', () => {
    const input = { password: 'secret' };
    redactSensitive(input);
    expect(input.password).toBe('secret');
  });

  it('passes through primitives unchanged', () => {
    expect(redactSensitive('hello')).toBe('hello');
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(true)).toBe(true);
  });

  it('handles empty objects and arrays', () => {
    expect(redactSensitive({})).toEqual({});
    expect(redactSensitive([])).toEqual([]);
  });
});
