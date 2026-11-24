const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const SESSION_EMAIL_KEY = 'clc_session_email';

export function getSessionEmail(): string | null {
  return localStorage.getItem(SESSION_EMAIL_KEY);
}

export function setSessionEmail(email: string | null): void {
  if (email) {
    localStorage.setItem(SESSION_EMAIL_KEY, email.trim().toLowerCase());
  } else {
    localStorage.removeItem(SESSION_EMAIL_KEY);
  }
}

export function getApiBase(): string {
  return API_BASE;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const authMode = import.meta.env.VITE_AUTH_MODE || 'DevMock';
  const sessionEmail = getSessionEmail();

  if (authMode === 'DevMock' && sessionEmail) {
    headers.set('X-Dev-User-Email', sessionEmail);
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
