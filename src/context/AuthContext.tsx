import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  enterDevMode: (email: string, fullName?: string) => void;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [devUser, setDevUser] = useState<User | null>(null);
  const DEV_USER_KEY = 'dev_auth_user';
  const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

  const toDevUser = (email: string, fullName?: string): User => ({
    id: DEV_USER_ID,
    app_metadata: {},
    user_metadata: { full_name: fullName ?? 'مستخدم تجريبي' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: email.toLowerCase(),
    phone: '',
    role: 'authenticated',
    identities: [],
    factors: [],
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  } as unknown as User);

  const enterDevMode = (email: string, fullName?: string) => {
    const u = toDevUser(email, fullName);
    localStorage.setItem(DEV_USER_KEY, JSON.stringify({ email: u.email, full_name: fullName ?? 'مستخدم تجريبي' }));
    setDevUser(u);
    setSession(null);
    setIsAdmin(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem(DEV_USER_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { email: string; full_name?: string };
        if (parsed?.email) setDevUser(toDevUser(parsed.email, parsed.full_name));
      } catch {}
    }

    // Listener FIRST (avoid races)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        localStorage.removeItem(DEV_USER_KEY);
        setDevUser(null);
      }
      // Defer role check to avoid deadlocks inside the listener
      if (sess?.user) {
        setTimeout(async () => {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', sess.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          setIsAdmin(!!data);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem(DEV_USER_KEY);
    setDevUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? devUser ?? null,
      session,
      loading,
      isAdmin,
      signOut,
      enterDevMode,
      isDevMode: !session?.user && !!devUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
