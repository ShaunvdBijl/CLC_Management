const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const DEV_EMAIL_KEY = 'clc_dev_user_email';

export function getDevUserEmail(): string {
  return localStorage.getItem(DEV_EMAIL_KEY) || 'campus.head@main.clc.edu';
}

export function setDevUserEmail(email: string): void {
  localStorage.setItem(DEV_EMAIL_KEY, email);
}

export function getApiBase(): string {
  return API_BASE;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const authMode = import.meta.env.VITE_AUTH_MODE || 'DevMock';

  if (authMode === 'DevMock') {
    headers.set('X-Dev-User-Email', getDevUserEmail());
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const problem = await res.json();
      message = problem.detail || problem.title || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
