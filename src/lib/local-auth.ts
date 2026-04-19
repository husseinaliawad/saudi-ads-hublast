export type AuthUser = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
  created_at: string;
};

type StoredUser = AuthUser & {
  password: string;
};

const USERS_KEY = 'local_auth_users_v1';
const SESSION_KEY = 'local_auth_session_v1';

function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as StoredUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function stripPassword(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    created_at: user.created_at,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getSessionUser(): AuthUser | null {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const user = loadUsers().find((u) => u.id === id);
    return user ? stripPassword(user) : null;
  } catch {
    return null;
  }
}

export function signOutLocal() {
  localStorage.removeItem(SESSION_KEY);
}

export function signUpLocal(params: {
  email: string;
  password: string;
  fullName?: string;
}): { user: AuthUser | null; error: string | null } {
  const email = normalizeEmail(params.email);
  const users = loadUsers();
  if (users.some((u) => u.email === email)) {
    return { user: null, error: 'هذا البريد مسجل مسبقًا' };
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    password: params.password,
    created_at: now,
    user_metadata: { full_name: params.fullName?.trim() || '' },
  };
  users.push(user);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, user.id);
  return { user: stripPassword(user), error: null };
}

export function signInLocal(params: {
  email: string;
  password: string;
}): { user: AuthUser | null; error: string | null } {
  const email = normalizeEmail(params.email);
  const user = loadUsers().find((u) => u.email === email && u.password === params.password);
  if (!user) return { user: null, error: 'البريد أو كلمة المرور غير صحيحة' };
  localStorage.setItem(SESSION_KEY, user.id);
  return { user: stripPassword(user), error: null };
}
