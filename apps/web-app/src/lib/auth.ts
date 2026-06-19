/**
 * PipeVitta — Auth Utilities
 *
 * Provides SHA-256 password hashing via Web Crypto API
 * and cookie management for JWT token + user/tenant metadata.
 */

/** Hash a plaintext password using SHA-256 (matches backend seed expectation). */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Parsed shape of the user stored in cookie. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  profiles: string[];
}

/** Parsed shape of the tenant stored in cookie. */
export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

/* ---------- Cookie helpers (client-side) ---------- */

const COOKIE_TOKEN = 'pipevitta_token';
const COOKIE_USER = 'pipevitta_user';
const COOKIE_TENANT = 'pipevitta_tenant';

/** Max age in seconds — 7 days. */
const MAX_AGE = 60 * 60 * 24 * 7;

function setCookie(name: string, value: string, maxAge: number = MAX_AGE): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}

/** Persist login response data into cookies. */
export function saveAuthCookies(
  accessToken: string,
  user: AuthUser,
  tenant: AuthTenant,
): void {
  setCookie(COOKIE_TOKEN, accessToken);
  setCookie(COOKIE_USER, JSON.stringify(user));
  setCookie(COOKIE_TENANT, JSON.stringify(tenant));
}

/** Clear all auth cookies (logout). */
export function clearAuthCookies(): void {
  deleteCookie(COOKIE_TOKEN);
  deleteCookie(COOKIE_USER);
  deleteCookie(COOKIE_TENANT);
}

/** Read user from cookie (client-side). Returns null if absent. */
export function getAuthUser(): AuthUser | null {
  const raw = getCookie(COOKIE_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Read tenant from cookie (client-side). Returns null if absent. */
export function getAuthTenant(): AuthTenant | null {
  const raw = getCookie(COOKIE_TENANT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTenant;
  } catch {
    return null;
  }
}
