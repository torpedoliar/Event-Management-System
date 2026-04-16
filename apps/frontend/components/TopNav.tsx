"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Monitor, UserCheck, LayoutDashboard, Users, UserPlus, Gift, Dices, Settings, LogOut, LogIn, Info, Menu, X, Radio, UserCog, Package, BarChart3, CalendarDays, Activity } from "lucide-react";

import { apiBase } from "../lib/api";
import { useSSE } from "../lib/sse-context";
import EventSelector from "./EventSelector";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuth, setIsAuth] = useState(false);
  const [eventCfg, setEventCfg] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { addEventListener, removeEventListener, connected } = useSSE();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAuth(!!localStorage.getItem('token'));

      const fetchConfig = () => {
        fetch(`${apiBase()}/config/event`)
          .then(r => r.json())
          .then(data => setEventCfg(data))
          .catch(err => console.error('Config fetch error:', err));
      };

      fetchConfig();

      const onConfig = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setEventCfg((prev: any) => ({ ...prev, ...data }));
        } catch (err) {
          console.error('SSE Parse Error', err);
        }
      };

      const onEventChange = (e: MessageEvent) => {
        // When event changes, reload config and refresh page data
        fetchConfig();
      };

      addEventListener('config', onConfig);
      addEventListener('event_change', onEventChange);
      return () => {
        removeEventListener('config', onConfig);
        removeEventListener('event_change', onEventChange);
      };
    }
  }, [pathname, addEventListener, removeEventListener]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Hide nav on public display and login pages
  if (pathname?.startsWith('/show') || pathname === '/admin/login') return null;

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      router.push('/admin/login');
    }
  };

  const linkCls = (href: string) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${active
      ? 'bg-white/15 text-white shadow-lg border border-white/20'
      : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
      }`;
  };

  const NavLinks = () => (
    <>
      {/* Public Links */}
      <Link className={linkCls('/show')} href="/show">
        <Monitor size={16} />
        <span>Display</span>
      </Link>
      <Link className={linkCls('/checkin')} href="/checkin">
        <UserCheck size={16} />
        <span>Check-in</span>
      </Link>
      {isAuth && (
        <>
          {/* Admin Core */}
          <div className="hidden md:block w-px h-6 bg-white/20 mx-1" />
          <Link className={linkCls('/admin/dashboard')} href="/admin/dashboard">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <Link className={linkCls('/admin/statistics')} href="/admin/statistics">
            <BarChart3 size={16} />
            <span>Statistik</span>
          </Link>
          <Link className={linkCls('/admin/guests')} href="/admin/guests">
            <Users size={16} />
            <span>Tamu</span>
          </Link>
          {/* Lucky Draw & Souvenirs */}
          <div className="hidden md:block w-px h-6 bg-white/20 mx-1" />
          <Link className={linkCls('/luckydraw')} href="/luckydraw">
            <Dices size={16} />
            <span>Lucky Draw</span>
          </Link>
          <Link className={linkCls('/souvenir')} href="/souvenir">
            <Package size={16} />
            <span>Souvenir / Hadiah</span>
          </Link>
          {/* Settings */}
          <div className="hidden md:block w-px h-6 bg-white/20 mx-1" />
          <Link className={linkCls('/admin/events')} href={"/admin/events" as any}>
            <CalendarDays size={16} />
            <span>Events</span>
          </Link>
          <Link className={linkCls('/admin/settings/event')} href="/admin/settings/event">
            <Settings size={16} />
            <span>Settings</span>
          </Link>
          <Link className={linkCls('/admin/system')} href={"/admin/system" as any}>
            <Activity size={16} />
            <span>System</span>
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className="w-full sticky top-0 z-50 glass-nav">
      <div className="w-full px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center relative">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 flex-shrink-0 justify-self-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Users size={16} className="text-white" />
              </div>
              <span className="font-bold text-white text-lg hidden sm:block">
                {eventCfg?.name || 'Event Management System'}
              </span>
            </div>
            {/* Event Selector - only for authenticated users */}
            {isAuth && <EventSelector />}
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
              <Radio size={12} className={`${connected ? 'text-emerald-400 pulse-live' : 'text-red-400'}`} />
              <span className="text-xs text-white/60">{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-center gap-2 justify-self-center">
            {!isAuth && pathname?.startsWith('/checkin') ? (
              <>
                <Link className={linkCls('/checkin')} href="/checkin">
                  <UserCheck size={16} />
                  <span>Check-in</span>
                </Link>
              </>
            ) : (
              <NavLinks />
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 flex-shrink-0 justify-self-end">
            {/* Desktop auth buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {!isAuth ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  href="/admin/login"
                >
                  <LogIn size={16} />
                  Login
                </Link>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 border border-white/20 transition-all duration-200"
                  onClick={logout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              )}
              <Link className={linkCls('/about')} href="/about">
                <Info size={16} />
                <span>About</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-2 border-t border-white/10 pt-4 space-y-2 animate-in slide-in-from-top duration-200">
            <div className="flex flex-col gap-1">
              <NavLinks />
            </div>
            <div className="border-t border-white/10 pt-3 mt-3 flex flex-col gap-1">
              {!isAuth ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  href="/admin/login"
                >
                  <LogIn size={16} />
                  Login
                </Link>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10"
                  onClick={logout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              )}
              <Link className={linkCls('/about')} href="/about">
                <Info size={16} />
                <span>About</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
