import type { BirthdayInput, BirthdayList, User } from './types';
import { getActiveLocale } from './i18n/locale';
import type { Locale } from './i18n/locale';
import { translations } from './i18n/translations';

type ApiErrorBody = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

type ApiEnvelope<Data> = { data: Data } | { error: ApiErrorBody };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL;
if (!configuredBaseURL) throw new Error('VITE_API_BASE_URL is not configured.');
const apiBaseURL = configuredBaseURL.replace(/\/+$/, '');

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string';
}

async function parseResponse<Data>(response: Response): Promise<Data> {
  const text = await response.text();
  if (response.ok && text === '') return undefined as Data;

  let payload: ApiEnvelope<Data> | null = null;

  if (text && response.headers.get('content-type')?.includes('application/json')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (isRecord(parsed) && ('data' in parsed || 'error' in parsed)) payload = parsed as ApiEnvelope<Data>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload === null || 'error' in payload) {
    const error = payload !== null && 'error' in payload && isApiErrorBody(payload.error)
      ? payload.error
      : { code: 'REQUEST_FAILED', message: translations[getActiveLocale()].common.requestFailed };
    if (response.status === 401) csrfToken = null;
    throw new ApiError(response.status, error.code, error.message, error.fields ?? {});
  }

  return payload.data;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (csrfTokenRequest) return csrfTokenRequest;

  csrfTokenRequest = (async () => {
    const response = await fetch(`${apiBaseURL}/auth/csrf`, {
      credentials: 'include',
      headers: { 'Accept-Language': getActiveLocale() },
    });
    const data = await parseResponse<{ token: string }>(response);
    csrfToken = data.token;
    return csrfToken;
  })();

  try {
    return await csrfTokenRequest;
  } finally {
    csrfTokenRequest = null;
  }
}

async function request<Data>(path: string, init: RequestInit = {}, retryCsrf = true): Promise<Data> {
  const method = (init.method ?? 'GET').toUpperCase();
  const requiresCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers = new Headers(init.headers);
  headers.set('Accept-Language', getActiveLocale());
  if (init.body) headers.set('Content-Type', 'application/json');
  if (requiresCsrf) headers.set('X-CSRF-TOKEN', await getCsrfToken());

  const response = await fetch(`${apiBaseURL}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });

  if (requiresCsrf && retryCsrf && response.status === 403) {
    csrfToken = null;
    return request<Data>(path, init, false);
  }

  return parseResponse<Data>(response);
}

const json = (data: unknown) => JSON.stringify(data);

export const api = {
  register: (name: string, email: string, password: string, passwordConfirmation: string, locale: Locale) =>
    request<void>('/auth/register', { method: 'POST', body: json({ name, email, password, passwordConfirmation, locale }) }),
  login: (email: string, password: string) =>
    request<void>('/auth/login', { method: 'POST', body: json({ email, password }) }),
  logout: async () => {
    try {
      await request<void>('/auth/logout', { method: 'POST' });
    } finally {
      csrfToken = null;
    }
  },
  requestEmailVerification: (email: string) =>
    request<void>('/auth/email-verification/request', { method: 'POST', body: json({ email }) }),
  getEmailVerificationStatus: () =>
    request<{ verified: boolean }>('/auth/email-verification/status'),
  confirmEmailVerification: (token: string) =>
    request<void>('/auth/email-verification/confirm', { method: 'POST', body: json({ token }) }),
  requestPasswordReset: (email: string) =>
    request<void>('/auth/password-reset/request', { method: 'POST', body: json({ email }) }),
  validatePasswordResetToken: (token: string) =>
    request<void>('/auth/password-reset/validate', { method: 'POST', body: json({ token }) }),
  resetPassword: (token: string, password: string, passwordConfirmation: string) =>
    request<void>('/auth/password-reset/confirm', { method: 'POST', body: json({ token, password, passwordConfirmation }) }),
  getProfile: () => request<User>('/profile'),
  updateProfile: (name: string, email: string, currentPassword: string) =>
    request<User>('/profile', { method: 'PATCH', body: json({ name, email, currentPassword }) }),
  updateLocale: (locale: Locale) =>
    request<void>('/profile/locale', { method: 'PATCH', body: json({ locale }) }),
  cancelEmailChange: () =>
    request<User>('/profile/email-change', { method: 'DELETE' }),
  requestPasswordChange: () =>
    request<void>('/profile/password-change/request', { method: 'POST' }),
  deleteAccount: async (password: string) => {
    await request<void>('/profile', { method: 'DELETE', body: json({ password }) });
    csrfToken = null;
  },
  listBirthdays: (search: string, page: number, perPage: number) => {
    const query = new URLSearchParams({ search, page: String(page), perPage: String(perPage) });
    return request<BirthdayList>(`/birthdays?${query}`);
  },
  createBirthday: (birthday: BirthdayInput) =>
    request<void>('/birthdays', { method: 'POST', body: json(birthday) }),
  updateBirthday: (birthdayId: number, birthday: BirthdayInput) =>
    request<void>(`/birthdays/${birthdayId}`, { method: 'PATCH', body: json(birthday) }),
  deleteBirthday: (birthdayId: number) =>
    request<void>(`/birthdays/${birthdayId}`, { method: 'DELETE' }),
};

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : translations[getActiveLocale()].common.requestCouldNotBeProcessed;
}

export function formErrors(error: unknown, visibleFields: readonly string[]): { message: string; fields: Record<string, string> } {
  if (!(error instanceof ApiError)) {
    return { message: errorMessage(error), fields: {} };
  }

  const fieldNames = Object.keys(error.fields);
  const hasUnmappedError = fieldNames.some((field) => !visibleFields.includes(field));

  return {
    message: fieldNames.length > 0 && !hasUnmappedError ? '' : error.message,
    fields: error.fields,
  };
}
