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
  Mail,
  Globe,
  UserCog,
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
  const adminMenuButtonRef = useRef<HTMLButtonElement>(null);
  const brandLinkRef = useRef<HTMLAnchorElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  const mobileWasOpen = useRef(false);
  const backgroundStateRef = useRef<Array<{ element: HTMLElement; inert: boolean; ariaHidden: string | null }>>([]);

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
    const closeDrawerOnDesktop = () => {
      if (window.matchMedia?.('(min-width: 1024px)').matches) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', closeDrawerOnDesktop);
    return () => window.removeEventListener('resize', closeDrawerOnDesktop);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(e.target as Node)
      ) {
        setAdminMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAdminMenuOpen(false);
        adminMenuButtonRef.current?.focus();
      }
    };
    if (adminMenuOpen) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener('keydown', onKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [adminMenuOpen]);

  useEffect(() => {
    const drawer = mobileDrawerRef.current;
    if (!drawer) return;

    if (!mobileMenuOpen) {
      drawer.setAttribute("inert", "");
      if (mobileWasOpen.current) {
        const focusTarget = window.matchMedia?.('(min-width: 1024px)').matches
          ? brandLinkRef.current
          : mobileMenuButtonRef.current;
        focusTarget?.focus();
      }
      return;
    }

    drawer.removeAttribute("inert");
    const overlay = mobileOverlayRef.current;
    const background = Array.from(drawer.parentElement?.children ?? [])
      .filter((element): element is HTMLElement =>
        element instanceof HTMLElement && element !== drawer && element !== overlay,
      )
      .map((element) => ({
        element,
        inert: element.hasAttribute("inert"),
      }));
    backgroundStateRef.current = background.map(({ element, inert }) => ({
      element,
      inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    background.forEach(({ element }) => element.setAttribute("inert", ""));

    requestAnimationFrame(() => drawer.querySelector<HTMLElement>("[data-drawer-close]")?.focus());

    return () => {
      backgroundStateRef.current.forEach(({ element, inert, ariaHidden }) => {
        if (!inert) element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      backgroundStateRef.current = [];
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      mobileWasOpen.current = false;
      return;
    }
    mobileWasOpen.current = true;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !mobileDrawerRef.current) return;

      const focusable = Array.from(
        mobileDrawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !mobileDrawerRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !mobileDrawerRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  if (pathname?.startsWith("/show") || pathname === "/admin/login") return null;
  const isRegisterPage = pathname === "/register";

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      router.push("/admin/login");
    }
  };

  const adminLinkGroups = [
    {
      label: 'Ringkasan',
      links: [
        { href: '/admin/dashboard', label: 'Dasbor', icon: <LayoutDashboard size={16} /> },
        { href: '/admin/statistics', label: 'Statistik', icon: <BarChart3 size={16} /> },
      ],
    },
    {
      label: 'Operasional',
      links: [
        { href: '/admin/guests', label: 'Tamu', icon: <Users size={16} /> },
        { href: '/luckydraw', label: 'Undian', icon: <Dices size={16} /> },
        { href: '/souvenir', label: 'Souvenir', icon: <Package size={16} /> },
        ...(eventCfg?.enableTournament
          ? [
              { href: '/admin/tournaments', label: 'Turnamen', icon: <Trophy size={16} /> },
              { href: '/tournament-checkin', label: 'Check-in turnamen', icon: <QrCode size={16} /> },
            ]
          : []),
      ],
    },
    {
      label: 'Pengaturan',
      links: [
        { href: '/admin/events', label: 'Acara', icon: <CalendarDays size={16} /> },
        { href: '/admin/settings/event', label: 'Event & stasiun', icon: <Settings size={16} /> },
        { href: '/admin/settings/landing-page', label: 'Halaman publik', icon: <Layout size={16} /> },
        { href: '/admin/settings/public-registration', label: 'Pendaftaran publik', icon: <Globe size={16} /> },
        { href: '/admin/settings/users', label: 'Pengguna', icon: <UserCog size={16} /> },
        { href: '/admin/settings/email', label: 'Email', icon: <Mail size={16} /> },
        { href: '/admin/system', label: 'Sistem', icon: <Activity size={16} /> },
      ],
    },
  ] satisfies { label: string; links: AdminLink[] }[];
  const adminLinks = adminLinkGroups.flatMap((group) => group.links);

  const routeMatches = (href: string) =>
    pathname === href || (href !== '/' && Boolean(pathname?.startsWith(`${href}/`)));
  const ariaCurrentFor = (href: string) =>
    pathname === href ? 'page' : routeMatches(href) ? 'location' : undefined;
  const adminLinkMatches = (href: string) => routeMatches(href);
  const isAdminActive = Boolean(pathname?.startsWith('/admin/')) ||
    adminLinks.some((link) => adminLinkMatches(link.href));

  const linkCls = (href: string) => {
    const active = routeMatches(href);
    return cn(
      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast",
      active
        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
        : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
    );
  };

  const mobileLinkCls = (href: string) => {
    const active = routeMatches(href);
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
              <Link
                ref={brandLinkRef}
                href="/"
                aria-label={`${eventCfg?.name || 'Event Management'} — Beranda`}
                className="flex items-center gap-2.5 group shrink-0"
              >
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
              {!isRegisterPage && (
                <Link className={linkCls("/checkin")} href="/checkin" aria-current={ariaCurrentFor('/checkin')}>
                  <UserCheck size={16} />
                  <span>Check-in</span>
                </Link>
              )}

              <Link className={linkCls("/register")} href="/register" aria-current={ariaCurrentFor('/register')}>
                <UserPlus size={16} />
                <span>Daftar</span>
              </Link>

              {isAuth && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    ref={adminMenuButtonRef}
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast",
                      isAdminActive || adminMenuOpen
                        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                        : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
                    )}
                    aria-expanded={adminMenuOpen}
                    aria-controls={adminMenuOpen ? 'topnav-admin-panel' : undefined}
                    data-active={isAdminActive || undefined}
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
                    <div
                      id="topnav-admin-panel"
                      aria-label="Navigasi admin"
                      className="absolute top-full left-0 mt-2 w-64 bg-brand-bgElevated border border-brand-border rounded-xl shadow-panel overflow-hidden z-50 animate-scaleIn origin-top-left"
                    >
                      <nav className="p-2" aria-label="Navigasi admin">
                        {adminLinkGroups.map((group) => (
                          <section key={group.label} className="py-1.5">
                            <h3 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-textDim">
                              {group.label}
                            </h3>
                            <div className="space-y-0.5">
                              {group.links.map((link) => (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  aria-current={ariaCurrentFor(link.href)}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    adminLinkMatches(link.href)
                                      ? "bg-brand-primary/10 text-brand-primary"
                                      : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
                                  )}
                                >
                                  <span className="text-brand-textDim">{link.icon}</span>
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          </section>
                        ))}
                      </nav>
                    </div>
                  )}
                </div>
              )}

              {!isRegisterPage && (
                <Link className={linkCls("/about")} href="/about" aria-current={ariaCurrentFor('/about')}>
                  <Info size={16} />
                  <span>About</span>
                </Link>
              )}
            </div>

            {/* Right: status + auth */}
            <div className="flex items-center gap-2 shrink-0">
              {!isRegisterPage && (
                <HelpPanel contextSection={
                  pathname?.startsWith('/checkin') ? 'checkin' :
                  pathname?.startsWith('/luckydraw') ? 'luckydraw' :
                  pathname?.startsWith('/admin/guests') ? 'guests' :
                  undefined
                } />
              )}
              {!isRegisterPage && isAuth && (
                <StatusBadge
                  status={connected ? "success" : "warning"}
                  pulse={connected}
                  className="hidden sm:inline-flex"
                >
                  {connected ? "Realtime aktif" : "Realtime terputus"}
                </StatusBadge>
              )}
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
                ref={mobileMenuButtonRef}
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                aria-expanded={mobileMenuOpen}
                aria-controls="topnav-mobile-drawer"
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
          ref={mobileOverlayRef}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <div
        ref={mobileDrawerRef}
        id="topnav-mobile-drawer"
        role={mobileMenuOpen ? 'dialog' : undefined}
        aria-label={mobileMenuOpen ? 'Navigasi utama' : undefined}
        aria-modal={mobileMenuOpen ? 'true' : undefined}
        aria-hidden={!mobileMenuOpen}
        className={`fixed inset-y-0 right-0 z-50 w-[min(80vw,320px)] bg-brand-bgElevated/95 backdrop-blur-xl border-l border-brand-border shadow-panel transition-transform duration-300 ease-expo lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-brand-border shrink-0">
          <span className="font-semibold text-brand-text text-sm">Menu</span>
          <IconButton
            data-drawer-close
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={20} />
          </IconButton>
        </div>

        <div className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto overscroll-contain">
          {/* Public / primary */}
          {!isRegisterPage && (
            <Link className={mobileLinkCls("/checkin")} href="/checkin" aria-current={ariaCurrentFor('/checkin')}>
              <UserCheck size={16} /> Check-in
            </Link>
          )}
          <Link className={mobileLinkCls("/register")} href="/register" aria-current={ariaCurrentFor('/register')}>
            <UserPlus size={16} /> Daftar
          </Link>
          {!isRegisterPage && (
            <Link className={mobileLinkCls("/about")} href="/about" aria-current={ariaCurrentFor('/about')}>
              <Info size={16} /> About
            </Link>
          )}

          {isAuth && (
            <>
              <div className="pt-2 mt-2 border-t border-brand-border">
                <div className="px-3 py-2 text-xs font-medium text-brand-textDim uppercase tracking-wider">
                  Administrasi
                </div>
              </div>
              {adminLinkGroups.map((group) => (
                <section key={group.label} className="pt-2">
                  <h3 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-textDim">
                    {group.label}
                  </h3>
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      className={mobileLinkCls(link.href)}
                      href={link.href}
                      aria-current={ariaCurrentFor(link.href)}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  ))}
                </section>
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
      </div>
    </>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
