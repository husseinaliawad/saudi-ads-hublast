import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, getSessionUser, signOutLocal } from '@/lib/local-auth';

interface AuthContextValue {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  enterDevMode: (email: string, fullName?: string) => void;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEV_USER_KEY = 'dev_auth_user';
const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

function toDevUser(email: string, fullName?: string): AuthUser {
  return {
    id: DEV_USER_ID,
    created_at: new Date().toISOString(),
    email: email.toLowerCase(),
    user_metadata: { full_name: fullName ?? 'مستخدم تجريبي' },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: AuthUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [devUser, setDevUser] = useState<AuthUser | null>(null);

  const enterDevMode = (email: string, fullName?: string) => {
    const u = toDevUser(email, fullName);
    localStorage.setItem(DEV_USER_KEY, JSON.stringify({ email: u.email, full_name: u.user_metadata?.full_name ?? '' }));
    signOutLocal();
    setDevUser(u);
    setSession(null);
    setIsAdmin(false);
  };

  useEffect(() => {
    (async () => {
      const liveUser = await getSessionUser();
      if (liveUser) {
        localStorage.removeItem(DEV_USER_KEY);
        setDevUser(null);
        setSession({ user: liveUser });
        setIsAdmin(Boolean(liveUser.is_admin) || liveUser.email === 'admin@local.test');
        setLoading(false);
        return;
      }

      const saved = localStorage.getItem(DEV_USER_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { email: string; full_name?: string };
          if (parsed?.email) setDevUser(toDevUser(parsed.email, parsed.full_name));
        } catch {
          localStorage.removeItem(DEV_USER_KEY);
        }
      }

      setIsAdmin(false);
      setLoading(false);
    })();
  }, []);

  const signOut = async () => {
    localStorage.removeItem(DEV_USER_KEY);
    signOutLocal();
    setDevUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? devUser ?? null,
        session,
        loading,
        isAdmin,
        signOut,
        enterDevMode,
        isDevMode: !session?.user && !!devUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
