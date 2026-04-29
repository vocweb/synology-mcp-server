#!/usr/bin/env node
/**
 * Smoke test for Synology Spreadsheet REST API against a real NAS / Docker
 * synology/spreadsheet-api container.
 *
 * Prereqs:
 *   - Synology Office package >= 3.6.0 (REST API ships in 3.7+)
 *   - synology/spreadsheet-api container running, reachable on SYNO_SS_HOST:SYNO_SS_PORT
 *   - DSM account with Office access
 *
 * Reads env from .env (if present) or current shell. Required vars match
 * .env.example: SYNO_HOST, SYNO_PORT, SYNO_HTTPS, SYNO_USERNAME, SYNO_PASSWORD.
 * Smoke-only vars: SYNO_SS_HOST, SYNO_SS_PORT, SYNO_SS_HTTPS.
 *
 * Usage:
 *   node --env-file=.env scripts/smoke-spreadsheet.mjs
 *
 * Exits 0 on success, 1 on first failure. Prints each step.
 */

import { request, Agent, setGlobalDispatcher } from 'undici';

const isTrue = (v) => v === '1' || v === 'true' || v === 'TRUE';

const cfg = {
  dsmHost: required('SYNO_HOST'),
  dsmPort: Number(process.env.SYNO_PORT ?? 5001),
  dsmHttps: isTrue(process.env.SYNO_HTTPS ?? 'true'),
  user: required('SYNO_USERNAME'),
  pass: required('SYNO_PASSWORD'),
  otp: process.env.SYNO_OTP_CODE ?? '',
  ignoreCert: isTrue(process.env.SYNO_IGNORE_CERT ?? 'false'),
  ssHost: process.env.SYNO_SS_HOST ?? process.env.SYNO_HOST,
  ssPort: Number(process.env.SYNO_SS_PORT ?? 3000),
  ssHttps: isTrue(process.env.SYNO_SS_HTTPS ?? 'false'),
};

if (cfg.ignoreCert) {
  setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));
}

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

const ssBase = `${cfg.ssHttps ? 'https' : 'http'}://${cfg.ssHost}:${cfg.ssPort}`;
const dsmBase = `${cfg.dsmHttps ? 'https' : 'http'}://${cfg.dsmHost}:${cfg.dsmPort}`;
const dsmHostField =
  (cfg.dsmHttps && cfg.dsmPort === 443) || (!cfg.dsmHttps && cfg.dsmPort === 80)
    ? cfg.dsmHost
    : `${cfg.dsmHost}:${cfg.dsmPort}`;

let token;
let fileId;

async function step(label, fn) {
  process.stdout.write(`▶ ${label} ... `);
  try {
    const out = await fn();
    console.log('OK');
    return out;
  } catch (err) {
    console.log('FAIL');
    console.error(err);
    process.exit(1);
  }
}

async function ssRequest(method, path, { body, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await request(`${ssBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new Error(`${method} ${path} → ${res.statusCode}: ${text}`);
  }
  if (raw) return Buffer.from(await res.body.arrayBuffer());
  if (res.statusCode === 204) return null;
  const ct = res.headers['content-type'] ?? '';
  if (ct.includes('application/json')) return res.body.json();
  return res.body.text();
}

(async () => {
  await step('Spreadsheet authorize (get JWT)', async () => {
    const body = await ssRequest('POST', '/spreadsheets/authorize', {
      body: {
        username: cfg.user,
        password: cfg.pass,
        host: dsmHostField,
        protocol: cfg.dsmHttps ? 'https' : 'http',
      },
    });
    if (!body?.token) throw new Error(`No token: ${JSON.stringify(body)}`);
    token = body.token;
  });

  await step('Create new spreadsheet', async () => {
    const body = await ssRequest('POST', '/spreadsheets/create', {
      body: { name: `smoke-${Date.now()}` },
    });
    if (!body?.spreadsheetId) throw new Error(`No spreadsheetId: ${JSON.stringify(body)}`);
    fileId = body.spreadsheetId;
  });

  let firstSheet;
  await step('Get spreadsheet info', async () => {
    const body = await ssRequest('GET', `/spreadsheets/${encodeURIComponent(fileId)}`);
    if (!body?.sheets?.length) throw new Error(`No sheets: ${JSON.stringify(body)}`);
    firstSheet = body.sheets[0].properties.title;
  });

  await step('Write A1:B2', async () => {
    const range = `${firstSheet}!A1:B2`;
    await ssRequest(
      'PUT',
      `/spreadsheets/${encodeURIComponent(fileId)}/values/${encodeURIComponent(range)}`,
      { body: { values: [['Hello', 'World'], [1, 2]] } },
    );
  });

  await step('Read A1:B2', async () => {
    const range = `${firstSheet}!A1:B2`;
    const body = await ssRequest(
      'GET',
      `/spreadsheets/${encodeURIComponent(fileId)}/values/${encodeURIComponent(range)}`,
    );
    if (!Array.isArray(body?.values)) throw new Error(`No values: ${JSON.stringify(body)}`);
  });

  await step('Append rows', async () => {
    const range = `${firstSheet}!A1:B2`;
    const body = await ssRequest(
      'PUT',
      `/spreadsheets/${encodeURIComponent(fileId)}/values/${encodeURIComponent(range)}/append`,
      { body: { values: [['x', 'y']] } },
    );
    if (!body?.updates) throw new Error(`No updates field: ${JSON.stringify(body)}`);
  });

  await step('Add sheet', async () => {
    const body = await ssRequest('POST', `/spreadsheets/${encodeURIComponent(fileId)}/sheet/add`, {
      body: { sheetName: 'Smoke2' },
    });
    if (!body?.addSheet?.properties?.sheetId) {
      throw new Error(`No sheetId: ${JSON.stringify(body)}`);
    }
  });

  await step('Export xlsx', async () => {
    const buf = await ssRequest(
      'GET',
      `/spreadsheets/${encodeURIComponent(fileId)}/xlsx`,
      { raw: true },
    );
    if (!buf?.length) throw new Error('Empty xlsx');
  });

  await step('Revoke token', async () => {
    await ssRequest('POST', '/spreadsheets/authorize/token/revoke');
  });

  console.log('\n✅ All smoke checks passed.');
})();
