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

/**
 * Authenticated request wrapper
 */
async function fetchWithAuth(path: string, options: RequestInit, token: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? 'Erro na requisição';
    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  if (res.status === 204) {
    return null;
  }
  return res.json().catch(() => null);
}

/* ==========================================
   1. Pacientes & PEP Clinical History
   ========================================== */

export async function getPatients(token: string): Promise<unknown[]> {
  return fetchWithAuth('/patients', { method: 'GET' }, token) as Promise<unknown[]>;
}

export async function getPatient(id: string, token: string): Promise<unknown> {
  return fetchWithAuth(`/patients/${id}`, { method: 'GET' }, token);
}

export async function createPatient(data: Record<string, unknown>, token: string): Promise<unknown> {
  return fetchWithAuth('/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

export async function addEvolution(patientId: string, content: string, token: string): Promise<unknown> {
  return fetchWithAuth(`/patients/${patientId}/evolutions`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }, token);
}

/* ==========================================
   2. Agenda (Appointments)
   ========================================== */

export async function getAppointments(token: string): Promise<unknown[]> {
  return fetchWithAuth('/agenda', { method: 'GET' }, token) as Promise<unknown[]>;
}

export async function getResources(token: string): Promise<unknown[]> {
  return fetchWithAuth('/agenda/resources', { method: 'GET' }, token) as Promise<unknown[]>;
}

export async function createAppointment(data: Record<string, unknown>, token: string): Promise<unknown> {
  return fetchWithAuth('/agenda', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

export async function updateAppointment(id: string, data: Record<string, unknown>, token: string): Promise<unknown> {
  return fetchWithAuth(`/agenda/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token);
}

export async function deleteAppointment(id: string, token: string): Promise<unknown> {
  return fetchWithAuth(`/agenda/${id}`, { method: 'DELETE' }, token);
}

/* ==========================================
   3. CRM Leads
   ========================================== */

export async function getLeads(token: string): Promise<unknown[]> {
  return fetchWithAuth('/crm', { method: 'GET' }, token) as Promise<unknown[]>;
}

export async function createLead(data: Record<string, unknown>, token: string): Promise<unknown> {
  return fetchWithAuth('/crm', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

export async function updateLead(id: string, data: Record<string, unknown>, token: string): Promise<unknown> {
  return fetchWithAuth(`/crm/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token);
}

export async function deleteLead(id: string, token: string): Promise<unknown> {
  return fetchWithAuth(`/crm/${id}`, { method: 'DELETE' }, token);
}

/* ==========================================
   4. Clinic Staff / Users
   ========================================== */

export async function getUsers(token: string): Promise<unknown[]> {
  return fetchWithAuth('/auth/users', { method: 'GET' }, token) as Promise<unknown[]>;
}
