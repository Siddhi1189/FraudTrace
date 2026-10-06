// PLACEHOLDER(FT-2): Client stores token in localStorage and transmits via Authorization Bearer header
const TOKEN_KEY = 'ft_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  error: string;
  statusCode?: number;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const rawBase = import.meta.env.VITE_API_BASE_URL || '';
  const baseUrl = rawBase.replace(/\/+$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`;
    const error: ApiError = { error: errorMsg, statusCode: response.status };
    throw error;
  }

  return data as T;
}
