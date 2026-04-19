import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signInLocal, signUpLocal } from '@/lib/local-auth';
import { useAuth } from '@/context/AuthContext';

const signInSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صالح').max(255),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف أو أكثر').max(72),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, 'الاسم قصير جدًا').max(100),
});

type Mode = 'sign-in' | 'sign-up';

const prettyAuthError = (message: string) => {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return 'البريد أو كلمة المرور غير صحيحة';
  }
  if (msg.includes('already')) {
    return 'هذا البريد مسجل مسبقًا';
  }
  return message;
};

const Auth = () => {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  const [sp] = useSearchParams();
  const redirect = sp.get('redirect') ?? '/';
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, navigate, redirect]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      if (mode === 'sign-up') {
        const parsed = signUpSchema.safeParse({ email, password, full_name: fullName });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }

        const { error } = signUpLocal({
          email: parsed.data.email,
          password: parsed.data.password,
          fullName: parsed.data.full_name,
        });

        if (error) {
          toast.error(prettyAuthError(error));
        } else {
          toast.success('تم إنشاء الحساب بنجاح');
          window.location.replace(redirect);
          return;
        }
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }

        const { error } = signInLocal({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (error) {
          toast.error(prettyAuthError(error));
        } else {
          toast.success('تم تسجيل الدخول بنجاح');
          window.location.replace(redirect);
          return;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      toast.error(prettyAuthError(message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-sand flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
        </Link>

        <div className="card-elevated p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-display font-extrabold text-xl shadow-elegant">
              س
            </div>
            <h1 className="font-display text-2xl font-extrabold">
              {mode === 'sign-in' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'sign-in' ? 'أهلاً بعودتك' : 'انضم إلى منصة سوق'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'sign-up' && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-bold">الاسم الكامل</label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="name"
                    type="text"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 bg-background border border-input rounded-xl pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-bold">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 bg-background border border-input rounded-xl pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-ring text-right"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-bold">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={6}
                  maxLength={72}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 bg-background border border-input rounded-xl pr-10 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-bold" disabled={busy}>
              {busy ? '...' : mode === 'sign-in' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {mode === 'sign-in' ? (
              <>
                ليس لديك حساب؟{' '}
                <button onClick={() => setMode('sign-up')} className="text-primary font-bold hover:underline">
                  أنشئ حسابًا جديدًا
                </button>
              </>
            ) : (
              <>
                لديك حساب بالفعل؟{' '}
                <button onClick={() => setMode('sign-in')} className="text-primary font-bold hover:underline">
                  سجل دخولك
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
