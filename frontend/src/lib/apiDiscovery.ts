/* API endpoint discovery with fallback candidates.
 * Chooses the first reachable base URL by probing /health.
 * Caches the result in localStorage to avoid repeated probing.
 */

import { API_BASE_URL as defaultApiBaseUrl } from '@/config/api';

const LOCAL_STORAGE_KEY = 'decided.api.baseUrl';

let decidedBaseUrl: string | null = null;
let discoveryPromise: Promise<string> | null = null;

function normalizeBaseUrl(url: string): string {
  if (!url) return url;
  // Ensure no trailing slash
  return url.replace(/\/$/, '');
}

function getRuntimeCandidates(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runtime = (typeof window !== 'undefined' ? (window as any).__RUNTIME_CONFIG__ : undefined) || {};
  const list: string[] = [];

  if (typeof runtime.apiBaseUrl === 'string' && runtime.apiBaseUrl) {
    list.push(runtime.apiBaseUrl);
  }
  if (Array.isArray(runtime.candidateApiBaseUrls)) {
    list.push(...runtime.candidateApiBaseUrls.filter((s: unknown) => typeof s === 'string'));
  }

  // Build-in defaults (ordered by proximity)
  list.push(defaultApiBaseUrl);
  list.push('http://localhost:3000/api');

  // Known pre-prod fallback (explicit per current project context)
  list.push('http://154.194.250.93:3000/api');

  // Remove falsy and duplicates, preserve order
  const seen = new Set<string>();
  const unique = list
    .filter(Boolean)
    .map(normalizeBaseUrl)
    .filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
  return unique;
}

async function probe(baseUrl: string, timeoutMs = 1000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/health`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    // Try to parse JSON; tolerate non-JSON
    try {
      const data = await res.json();
      return data && (data.status === 'OK' || data.status === 'Ok' || data.status === 'ok');
    } catch (_e) {
      return true; // if 200 but not json, still accept
    }
  } catch (_err) {
    clearTimeout(timer);
    return false;
  }
}

async function raceToFirstHealthy(candidates: string[], perProbeTimeoutMs = 1000): Promise<string | null> {
  if (candidates.length === 0) return null;
  return new Promise((resolve) => {
    let settled = false;
    let pending = candidates.length;
    const tryResolve = (winner: string | null) => {
      if (!settled) {
        settled = true;
        resolve(winner);
      }
    };
    candidates.forEach(async (base) => {
      const ok = await probe(base, perProbeTimeoutMs);
      pending -= 1;
      if (ok) {
        tryResolve(normalizeBaseUrl(base));
      } else if (pending === 0) {
        tryResolve(null);
      }
    });
  });
}

async function runDiscovery(): Promise<string> {
  // Cached in memory
  if (decidedBaseUrl) return decidedBaseUrl;
  // Cached in localStorage
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      decidedBaseUrl = cached;
      return decidedBaseUrl;
    }
  } catch (_e) {
    // ignore storage errors
  }

  const candidates = getRuntimeCandidates();
  const winner = await raceToFirstHealthy(candidates, 1000);
  if (winner) {
    decidedBaseUrl = winner;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, decidedBaseUrl);
    } catch (_e) {
      // ignore
    }
    return decidedBaseUrl;
  }

  // Fallback to default if nothing probed
  decidedBaseUrl = normalizeBaseUrl(defaultApiBaseUrl);
  return decidedBaseUrl;
}

export function clearDecidedApiBaseUrlCache(): void {
  decidedBaseUrl = null;
  discoveryPromise = null;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (_e) {
    // ignore
  }
}

export function getDecidedApiBaseUrlSync(): string | null {
  return decidedBaseUrl;
}

export async function ensureDecidedApiBaseUrl(): Promise<string> {
  if (decidedBaseUrl) return decidedBaseUrl;
  if (!discoveryPromise) discoveryPromise = runDiscovery();
  return discoveryPromise;
}

