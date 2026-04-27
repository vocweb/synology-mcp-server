/**
 * HTTP fetch helper that bridges Node's built-in fetch and undici's fetch.
 *
 * Why this exists: Node 24 ships an embedded undici (≈v7) for `globalThis.fetch`.
 * The project depends on a newer `undici` (v8) for `Agent` (self-signed cert
 * bypass). Passing a v8 `Agent` to v7's global fetch fails with
 * `UND_ERR_INVALID_ARG: invalid onRequestStart method` because the dispatcher
 * interceptor protocol changed between versions.
 *
 * Resolution: when a dispatcher is provided, route through `undici.fetch`
 * (matching version). Otherwise use global fetch so MSW request interception
 * (which patches `globalThis.fetch`) keeps working in tests.
 */

import { fetch as undiciFetch, type Agent } from 'undici';

/** Lightweight subset of the Response API actually used by callers. */
export interface FetchResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Performs an HTTP request, choosing the correct fetch implementation based on
 * whether a custom undici dispatcher is supplied.
 *
 * @param url - Absolute request URL.
 * @param init - Standard fetch init plus optional `dispatcher`.
 * @param dispatcher - undici Agent for self-signed cert bypass; undefined → global fetch.
 */
export async function httpFetch(
  url: string,
  init: Record<string, unknown>,
  dispatcher: Agent | undefined,
): Promise<FetchResponse> {
  if (dispatcher) {
    const merged = { ...init, dispatcher };
    return await undiciFetch(url, merged);
  }
  return await fetch(url, init);
}
