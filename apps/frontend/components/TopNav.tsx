"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Monitor, UserCheck, LayoutDashboard, Users, Dices, Settings, LogOut, LogIn, Info, Menu, X, Radio, Package, BarChart3, CalendarDays, Activity } from "lucide-react";
import { apiBase } from "../lib/api";
import { useSSE } from "../lib/sse-context";
import EventSelector from "./EventSelector";
import StatusBadge from "./ui/StatusBadge";
import IconButton from "./ui/IconButton";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [eventCfg, setEventCfg] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { addEventListener, removeEventListener, connected } = useSSE();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsAuth(!!localStorage.getItem('token'));

    const fetchConfig = () => {
      fetch(`${apiBase()}/config/event`)
        .then(r => r.json())
        .then(data => setEventCfg(data))
        .catch(err => console.error('Config fetch error:', err));
    };
    fetchConfig();

    const onConfig = (e: MessageEvent) => {
      try { setEventCfg((prev: any) => ({ ...prev, ...JSON.parse(e.data) })); } catch { }
    };
    const onEventChange = () => { fetchConfig(); };

    addEventListener('config', onConfig);
    addEventListener('event_change', onEventChange);
    return () => {
      removeEventListener('config', onConfig);
      removeEventListener('event_change', onEventChange);
    };
  }, [pathname, addEventListener, removeEventListener]);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  if (pathname?.startsWith('/show') || pathname === '/admin/login') return null;

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      router.push('/admin/login');
    }
  };

  const linkCls = (href: string) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
      ? 'bg-brand-primary/15 text-brand-primary border-b-2 border-brand-primary'
      : 'text-brand-textMuted hover:text-brand-text hover:bg-white/5'
      }`;
  };

  const mobileLinkCls = (href: string) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full ${active
      ? 'bg-brand-primary/15 text-brand-primary'
      : 'text-brand-textMuted hover:text-brand-text hover:bg-white/5'
      }`;
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => {
    const cls = mobile ? mobileLinkCls : linkCls;
    return (
      <>
        <Link className={cls('/checkin')} href="/checkin">
          <UserCheck size={16} />
          <span>Check-in</span>
        </Link>
        {isAuth && (
          <>
            <Link className={cls('/admin/dashboard')} href="/admin/dashboard">
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
            <Link className={cls('/admin/statistics')} href="/admin/statistics">
              <BarChart3 size={16} />
              <span>Statistik</span>
            </Link>
            <Link className={cls('/admin/guests')} href="/admin/guests">
              <Users size={16} />
              <span>Tamu</span>
            </Link>
            <Link className={cls('/luckydraw')} href="/luckydraw">
              <Dices size={16} />
              <span>Lucky Draw</span>
            </Link>
            <Link className={cls('/souvenir')} href="/souvenir">
              <Package size={16} />
              <span>Doorprize</span>
            </Link>
            <Link className={cls('/admin/events')} href="/admin/events">
              <CalendarDays size={16} />
              <span>Events</span>
            </Link>
            <Link className={cls('/admin/settings/event')} href="/admin/settings/event">
              <Settings size={16} />
              <span>Settings</span>
            </Link>
            <Link className={cls('/admin/system')} href="/admin/system">
              <Activity size={16} />
              <span>System</span>
            </Link>
          </>
        )}
      </>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 h-14 bg-brand-bgElevated/90 backdrop-blur-md border-b border-brand-border">
        <div className="w-full px-4 h-full">
          <div className="flex items-center justify-between gap-4 h-full">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="bg-gradient-to-br from-brand-primary to-brand-accent p-[1px] rounded-lg">
                  <div className="w-8 h-8 rounded-[7px] bg-brand-bgElevated flex items-center justify-center">
                    <Users size={16} className="text-brand-primary" />
                  </div>
                </div>
                <span className="font-semibold text-brand-text hidden sm:block">
                  {eventCfg?.name || 'Event Management'}
                </span>
              </Link>
              {isAuth && <EventSelector />}
            </div>

            <div className="hidden lg:flex items-center gap-1">
              <NavLinks />
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={connected ? 'success' : 'danger'} pulse={connected} className="hidden sm:inline-flex">
                {connected ? 'Live' : 'Offline'}
              </StatusBadge>
              <div className="hidden lg:flex items-center gap-2">
                {!isAuth ? (
                  <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold bg-brand-primary text-brand-bg hover:bg-[#c49a4a] transition-colors">
                    <LogIn size={16} />
                    Login
                  </Link>
                ) : (
                  <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-textMuted hover:text-brand-text hover:bg-white/5 transition-colors">
                    <LogOut size={16} />
                    Logout
                  </button>
                )}
                <Link className={linkCls('/about')} href="/about">
                  <Info size={16} />
                  <span>About</span>
                </Link>
              </div>
              <IconButton className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </IconButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-brand-bgElevated/95 backdrop-blur-xl border-l border-brand-border shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <span className="font-semibold text-brand-text text-sm">Menu</span>
          <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </IconButton>
        </div>
        <div className="p-3 space-y-1 overflow-y-auto">
          <NavLinks mobile />
          <div className="border-t border-brand-border pt-3 mt-3 flex flex-col gap-1">
            {!isAuth ? (
              <Link className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold bg-brand-primary text-brand-bg w-full" href="/admin/login">
                <LogIn size={16} /> Login
              </Link>
            ) : (
              <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-textMuted hover:text-brand-text hover:bg-white/5 text-left w-full">
                <LogOut size={16} /> Logout
              </button>
            )}
            <Link className={mobileLinkCls('/about')} href="/about">
              <Info size={16} /> About
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
