import { api, setAuthToken } from '@/lib/api';

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string;
  is_admin?: number | boolean;
  created_at: string;
  user_metadata?: {
    full_name?: string;
  };
};

type AuthResponse = {
  user: AuthUser;
  token: string;
};

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const res = await api<{ user: AuthUser }>('/api/auth/me');
    return res.user;
  } catch {
    return null;
  }
}

export function signOutLocal() {
  setAuthToken(null);
}

export async function signUpLocal(params: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const res = await api<AuthResponse>('/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        full_name: params.fullName ?? '',
      }),
    });
    setAuthToken(res.token);
    return { user: res.user, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'فشل إنشاء الحساب' };
  }
}

export async function signInLocal(params: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const res = await api<AuthResponse>('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    setAuthToken(res.token);
    return { user: res.user, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'فشل تسجيل الدخول' };
  }
}
