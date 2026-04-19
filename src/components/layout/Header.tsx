import { Link, NavLink } from 'react-router-dom';
import { Plus, Heart, MessageCircle, User, Menu, X, LogOut, LogIn, Bell, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { to: '/', label: 'الرئيسية' },
  { to: '/browse', label: 'تصفّح الإعلانات' },
  { to: '/browse?cat=cars', label: 'سيارات' },
  { to: '/browse?cat=real-estate', label: 'عقارات' },
  { to: '/browse?cat=jobs', label: 'وظائف' },
];

function UnreadDot() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let active = true;
    const fetchCount = async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_read', false);
      if (active) setUnread(count ?? 0);
    };
    fetchCount();
    const channelName = `notif:${user.id}:${Date.now()}`;
    const ch = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchCount)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  if (!user || unread === 0) return null;
  return (
    <span className="absolute top-1 left-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold num">
      {unread > 9 ? '9+' : unread}
    </span>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container-app flex h-16 items-center gap-4 lg:h-20">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-display font-extrabold text-lg shadow-elegant">
            س
          </div>
          <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">سوق</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 mr-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'text-primary bg-primary-soft' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="المفضلة"><Link to="/favorites"><Heart className="h-5 w-5" /></Link></Button>
              <Button asChild variant="ghost" size="icon" aria-label="الرسائل"><Link to="/messages"><MessageCircle className="h-5 w-5" /></Link></Button>
              <Button asChild variant="ghost" size="icon" aria-label="الإشعارات" className="relative">
                <Link to="/notifications"><Bell className="h-5 w-5" /><UnreadDot /></Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="حسابي"><Link to="/profile"><User className="h-5 w-5" /></Link></Button>
              {isAdmin && <Button asChild variant="ghost" size="icon" aria-label="لوحة التحكم"><Link to="/admin"><ShieldCheck className="h-5 w-5 text-primary" /></Link></Button>}
              <Button variant="ghost" size="icon" aria-label="خروج" onClick={signOut}><LogOut className="h-5 w-5" /></Button>
            </>
          ) : (
            <Button asChild variant="ghost" className="gap-2"><Link to="/auth"><LogIn className="h-4 w-4" /> دخول</Link></Button>
          )}
          <Button asChild className="gap-2 shadow-elegant mr-1"><Link to="/post-ad"><Plus className="h-4 w-4" /> أضف إعلانك</Link></Button>
        </div>

        <div className="flex md:hidden items-center gap-1">
          {user && (
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link to="/notifications"><Bell className="h-5 w-5" /><UnreadDot /></Link>
            </Button>
          )}
          <Button asChild size="sm" className="gap-1.5"><Link to="/post-ad"><Plus className="h-4 w-4" /> أضف</Link></Button>
          <Button variant="ghost" size="icon" aria-label="القائمة" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card animate-fade-in">
          <nav className="container-app py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn('px-4 py-3 rounded-lg text-base font-medium', isActive ? 'text-primary bg-primary-soft' : 'text-foreground hover:bg-accent')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border">
              {user ? (
                <>
                  <Button asChild variant="outline" className="gap-2"><Link to="/profile" onClick={() => setMobileOpen(false)}><User className="h-4 w-4" /> حسابي</Link></Button>
                  <Button asChild variant="outline" className="gap-2"><Link to="/favorites" onClick={() => setMobileOpen(false)}><Heart className="h-4 w-4" /> المفضلة</Link></Button>
                  <Button asChild variant="outline" className="gap-2"><Link to="/messages" onClick={() => setMobileOpen(false)}><MessageCircle className="h-4 w-4" /> الرسائل</Link></Button>
                  <Button asChild variant="outline" className="gap-2"><Link to="/my-ads" onClick={() => setMobileOpen(false)}>إعلاناتي</Link></Button>
                  {isAdmin && <Button asChild variant="outline" className="gap-2 col-span-2"><Link to="/admin" onClick={() => setMobileOpen(false)}><ShieldCheck className="h-4 w-4" /> لوحة التحكم</Link></Button>}
                  <Button variant="ghost" className="gap-2 col-span-2 text-destructive" onClick={() => { signOut(); setMobileOpen(false); }}><LogOut className="h-4 w-4" /> تسجيل الخروج</Button>
                </>
              ) : (
                <Button asChild variant="outline" className="gap-2 col-span-2"><Link to="/auth" onClick={() => setMobileOpen(false)}><LogIn className="h-4 w-4" /> تسجيل الدخول</Link></Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
