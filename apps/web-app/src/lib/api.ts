/**
 * PipeVitta — API Client
 *
 * Lightweight fetch wrapper for communicating with the NestJS backend.
 * Reads the API base URL from environment or defaults to localhost:3000.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

interface LoginPayload {
  tenantSlug: string;
  email: string;
  passwordHash: string;
}

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    profiles: string[];
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? 'Erro ao realizar login';
    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  return res.json() as Promise<LoginResponse>;
}
