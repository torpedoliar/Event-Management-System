"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  UserCheck,
  LayoutDashboard,
  Users,
  Dices,
  LogOut,
  LogIn,
  Info,
  Menu,
  X,
  Package,
  BarChart3,
  CalendarDays,
  Activity,
  Layout,
  Settings,
  ChevronDown,
  Trophy,
  QrCode,
  UserPlus,
} from "lucide-react";
import { apiBase } from "../lib/api";
import { useSSE } from "../lib/sse-context";
import EventSelector from "./EventSelector";
import StatusBadge from "./ui/StatusBadge";
import IconButton from "./ui/IconButton";
import Button from "./ui/Button";
import HelpPanel from "./HelpPanel";

interface AdminLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [eventCfg, setEventCfg] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const { addEventListener, removeEventListener, connected } = useSSE();
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsAuth(!!localStorage.getItem("token"));

    const fetchConfig = () => {
      fetch(`${apiBase()}/config/event`)
        .then((r) => r.json())
        .then((data) => setEventCfg(data))
        .catch((err) => console.error("Config fetch error:", err));
    };
    fetchConfig();

    const onConfig = (e: MessageEvent) => {
      try {
        setEventCfg((prev: any) => ({ ...prev, ...JSON.parse(e.data) }));
      } catch {}
    };
    const onEventChange = () => {
      fetchConfig();
    };

    addEventListener("config", onConfig);
    addEventListener("event_change", onEventChange);
    return () => {
      removeEventListener("config", onConfig);
      removeEventListener("event_change", onEventChange);
    };
  }, [pathname, addEventListener, removeEventListener]);

  // Cross-tab auth sync: listen for token changes in other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') {
        setIsAuth(!!e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAdminMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(e.target as Node)
      ) {
        setAdminMenuOpen(false);
      }
    };
    if (adminMenuOpen) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [adminMenuOpen]);

  if (pathname?.startsWith("/show") || pathname === "/admin/login") return null;

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      router.push("/admin/login");
    }
  };

  const adminLinks: AdminLink[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { href: "/admin/statistics", label: "Statistik", icon: <BarChart3 size={16} /> },
    { href: "/admin/guests", label: "Tamu", icon: <Users size={16} /> },
    { href: "/luckydraw", label: "Lucky Draw", icon: <Dices size={16} /> },
    { href: "/souvenir", label: "Lucky Draw", icon: <Package size={16} /> },
    ...(eventCfg?.enableTournament ? [{ href: "/admin/tournaments", label: "Tournament", icon: <Trophy size={16} /> }] : []),
    ...(eventCfg?.enableTournament ? [{ href: "/tournament-checkin", label: "Tournament Check-in", icon: <QrCode size={16} /> }] : []),
    { href: "/admin/events", label: "Events", icon: <CalendarDays size={16} /> },
    { href: "/admin/settings/event", label: "Settings", icon: <Settings size={16} /> },
    { href: "/admin/settings/landing-page", label: "Landing", icon: <Layout size={16} /> },
    { href: "/admin/system", label: "System", icon: <Activity size={16} /> },
  ];

  const isAdminActive = adminLinks.some(
    (l) => pathname === l.href || pathname?.startsWith(l.href)
  );

  const linkCls = (href: string) => {
    const active =
      pathname === href || (href !== "/" && pathname?.startsWith(href));
    return cn(
      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast",
      active
        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
        : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
    );
  };

  const mobileLinkCls = (href: string) => {
    const active =
      pathname === href || (href !== "/" && pathname?.startsWith(href));
    return cn(
      "inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full",
      active
        ? "bg-brand-primary/10 text-brand-primary"
        : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 h-16 bg-brand-bgElevated/80 backdrop-blur-xl border-b border-brand-border">
        <div className="container-padded h-full">
          <div className="flex items-center justify-between gap-4 h-full">
            {/* Left: brand + event selector */}
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center">
                    <Users size={18} className="text-brand-primary" />
                  </div>
                </div>
                <span className="font-semibold text-brand-text hidden sm:block truncate max-w-[160px] lg:max-w-[200px]">
                  {eventCfg?.name || "Event Management"}
                </span>
              </Link>
              {isAuth && (
                <div className="hidden sm:block">
                  <EventSelector />
                </div>
              )}
            </div>

            {/* Center: primary nav + admin dropdown */}
            <div className="hidden lg:flex items-center gap-2">
              <Link className={linkCls("/checkin")} href="/checkin">
                <UserCheck size={16} />
                <span>Check-in</span>
              </Link>

              <Link className={linkCls("/register")} href="/register">
                <UserPlus size={16} />
                <span>Daftar</span>
              </Link>

              {isAuth && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast",
                      isAdminActive || adminMenuOpen
                        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                        : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
                    )}
                    aria-expanded={adminMenuOpen}
                    aria-haspopup="menu"
                  >
                    <LayoutDashboard size={16} />
                    <span>Admin</span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-fast",
                        adminMenuOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {adminMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-brand-bgElevated/98 backdrop-blur-xl border border-brand-border rounded-xl shadow-panel overflow-hidden z-50 animate-scaleIn origin-top-left">
                      <div className="p-2 space-y-0.5">
                        {adminLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              pathname === link.href ||
                                pathname?.startsWith(link.href)
                                ? "bg-brand-primary/10 text-brand-primary"
                                : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
                            )}
                          >
                            <span className="text-brand-textDim">
                              {link.icon}
                            </span>
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Link className={linkCls("/about")} href="/about">
                <Info size={16} />
                <span>About</span>
              </Link>
            </div>

            {/* Right: status + auth */}
            <div className="flex items-center gap-2 shrink-0">
              <HelpPanel contextSection={
                pathname?.startsWith('/checkin') ? 'checkin' :
                pathname?.startsWith('/luckydraw') ? 'luckydraw' :
                pathname?.startsWith('/admin/guests') ? 'guests' :
                undefined
              } />
              <StatusBadge
                status={connected ? "success" : "danger"}
                pulse={connected}
                className="hidden sm:inline-flex"
              >
                {connected ? "Live" : "Offline"}
              </StatusBadge>
              <div className="hidden lg:flex items-center gap-2">
                {!isAuth ? (
                  <Button size="sm" asChild>
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center gap-2"
                    >
                      <LogIn size={16} />
                      Login
                    </Link>
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut size={16} />
                    Logout
                  </Button>
                )}
              </div>
              <IconButton
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </IconButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-80 bg-brand-bgElevated/95 backdrop-blur-xl border-l border-brand-border shadow-panel transition-transform duration-300 ease-expo lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <span className="font-semibold text-brand-text text-sm">Menu</span>
          <IconButton
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </IconButton>
        </div>

        <div className="p-3 space-y-1 overflow-y-auto">
          {/* Public / primary */}
          <Link className={mobileLinkCls("/checkin")} href="/checkin">
            <UserCheck size={16} /> Check-in
          </Link>
          <Link className={mobileLinkCls("/register")} href="/register">
            <UserPlus size={16} /> Daftar
          </Link>
          <Link className={mobileLinkCls("/about")} href="/about">
            <Info size={16} /> About
          </Link>

          {isAuth && (
            <>
              <div className="pt-2 mt-2 border-t border-brand-border">
                <div className="px-3 py-2 text-xs font-medium text-brand-textDim uppercase tracking-wider">
                  Admin
                </div>
              </div>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  className={mobileLinkCls(link.href)}
                  href={link.href}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </>
          )}

          <div className="border-t border-brand-border pt-3 mt-3 flex flex-col gap-1">
            {!isAuth ? (
              <Button asChild className="w-full justify-start">
                <Link href="/admin/login">
                  <LogIn size={16} /> Login
                </Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full justify-start"
              >
                <LogOut size={16} /> Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
