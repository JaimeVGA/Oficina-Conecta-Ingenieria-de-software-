'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  CheckSquare,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import type { PerfilUsuario } from '@/lib/supabase/types';
import { RoleBadge } from '@/components/layout/RoleBadge';
import {
  NetworkStatusBanner,
  SessionInactivityGuard,
  useSessionGuard,
} from '@/components/session/SessionInactivityGuard';
import {
  PreferencesProvider,
  getRegionLabel,
  usePreferences,
} from '@/components/preferences/PreferencesProvider';
import { UserAvatar } from '@/components/preferences/UserAvatar';
import { createSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  cacheCurrentPageForOffline,
  clearOfflineUserCache,
  registerOfflineServiceWorker,
} from '@/lib/offline/client';

function AppShellInner({
  perfil,
  mode: _mode,
  children,
}: {
  perfil: PerfilUsuario;
  mode: 'supabase' | 'local';
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedOutOffline, setLoggedOutOffline] = useState(false);
  const [logoutRetryMsg, setLogoutRetryMsg] = useState<string | null>(null);
  const { effectiveOnline, checkConnectionNow, checkingConnection } = useSessionGuard();
  const { t, locale, resolvedTheme, toggleDarkTheme, getUserCustomization } = usePreferences();

  const customization = getUserCustomization(perfil.id, perfil.rol);
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'midnight';

  useEffect(() => {
    void registerOfflineServiceWorker();
  }, []);

  useEffect(() => {
    if (!effectiveOnline) return;
    const timerId = window.setTimeout(() => {
      void cacheCurrentPageForOffline(window.location.href);
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [pathname, effectiveOnline]);

  const navItems = [
    { href: '/', label: t.navDashboard, icon: LayoutDashboard },
    { href: '/tareas', label: t.navTasks, icon: CheckSquare },
    { href: '/proyectos', label: t.navProjects, icon: FolderKanban },
    { href: '/autorizaciones', label: t.navAuthorizations, icon: FileCheck2 },
    { href: '/bitacora', label: t.navAuditLog, icon: ShieldAlert },
    { href: '/notificaciones', label: t.navNotifications, icon: Bell },
    { href: '/preferencias', label: t.navPreferences, icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
    } catch {
      // Ignorar
    }
    await clearOfflineUserCache();
    try {
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        await supabase?.auth.signOut({ scope: 'local' });
      }
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      }
    } catch {
      // Continuar incluso sin conexión
    }

    if (!effectiveOnline || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      setLoggedOutOffline(true);
      setLogoutRetryMsg(null);
      return;
    }

    router.replace('/login');
    router.refresh();
  };

  const handleGoToLoginAfterOfflineLogout = async () => {
    setLogoutRetryMsg(null);
    const connected = await checkConnectionNow();
    if (!connected) {
      setLogoutRetryMsg('Sin conexión a internet. Restablece tu conexión para volver a iniciar sesión.');
      return;
    }
    router.replace('/login');
    router.refresh();
  };

  if (loggedOutOffline) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 text-white p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center space-y-4">
          <LogOut className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-semibold">Sesión cerrada sin conexión</h2>
          <p className="text-sm text-slate-300">
            Tu sesión local y tus borradores en este navegador fueron eliminados de forma segura. Conéctate a internet
            para iniciar sesión nuevamente.
          </p>
          {logoutRetryMsg && (
            <div
              role="alert"
              className="bg-red-950/70 border border-red-700/60 text-red-200 rounded-lg p-3 text-xs flex items-center justify-center gap-2"
            >
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>{logoutRetryMsg}</span>
            </div>
          )}
          <button
            type="button"
            disabled={checkingConnection}
            onClick={() => void handleGoToLoginAfterOfflineLogout()}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 font-medium text-sm inline-flex items-center justify-center gap-2"
          >
            {checkingConnection && <RefreshCw className="w-4 h-4 animate-spin" />}
            {checkingConnection ? 'Verificando conexión...' : 'Ir a Iniciar Sesión'}
          </button>
        </div>
      </div>
    );
  }

  const isMoreRouteActive = ['/proyectos', '/bitacora', '/preferencias'].some(
    (p) => pathname === p || pathname.startsWith(p)
  );

  const bottomNavItems = [
    { href: '/', label: t.navDashboard.split(' ')[0] ?? t.navDashboard, icon: LayoutDashboard },
    { href: '/tareas', label: t.navTasks.split(' ')[0] ?? t.navTasks, icon: CheckSquare },
    { href: '/autorizaciones', label: t.navAuthorizations, icon: FileCheck2 },
    { href: '/notificaciones', label: t.navNotifications.split(' ')[0] ?? t.navNotifications, icon: Bell },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50">
      <NetworkStatusBanner />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-100 shrink-0">
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white">
                OC
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Oficina Conecta</p>
                <p className="text-[11px] text-slate-400">{t.appSubtitle}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!active && !effectiveOnline ? 'Requiere conexión para cambiar de sección' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${!active && !effectiveOnline ? 'opacity-60' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>Versión:</span>
              <span className="font-mono text-slate-200">v1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t.tzLabel}:</span>
              <span className="font-mono text-slate-200">America/Mexico_City</span>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
            <div className="relative w-[min(20rem,86vw)] max-h-[100dvh] overflow-y-auto bg-slate-900 text-slate-100 flex flex-col z-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white text-xs">
                    OC
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">Oficina Conecta</p>
                    <p className="text-[10px] text-slate-400">{t.appSubtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-slate-800"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-white truncate">{perfil.nombre_completo}</span>
                  <RoleBadge rol={perfil.rol} />
                </div>
                <p className="text-[11px] text-slate-300 break-all">{perfil.correo}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span>{perfil.sede_id ? getRegionLabel(perfil.sede_id, locale) : t.nationalScope}</span>
                </p>
              </div>

              <nav className="p-3 space-y-1 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={!active && !effectiveOnline ? 'Requiere conexión para cambiar de sección' : undefined}
                      className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium ${
                        active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      } ${!active && !effectiveOnline ? 'opacity-60' : ''}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center justify-between gap-2">
                  <span>Versión:</span>
                  <span className="font-mono text-slate-200 truncate">v1.0</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>{t.tzLabel}:</span>
                  <span className="font-mono text-slate-200">America/Mexico_City</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 shrink-0"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link
                href="/preferencias"
                className="min-w-0 flex items-center gap-2.5 group"
                title={t.navPreferences}
              >
                <UserAvatar
                  nombre={perfil.nombre_completo}
                  avatarDataUrl={customization.avatarDataUrl}
                  preset={customization.avatarPreset}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-semibold text-slate-900 text-sm group-hover:underline truncate max-w-[140px] sm:max-w-none">
                      {perfil.nombre_completo}
                    </span>
                    <RoleBadge rol={perfil.rol} />
                    <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Building2 className="w-3.5 h-3.5" />
                      {perfil.sede_id ? getRegionLabel(perfil.sede_id, locale) : t.nationalScope}
                    </span>
                  </div>
                  <p className="hidden sm:block text-xs text-slate-500 truncate">
                    {customization.puestoPersonalizado} · {perfil.correo}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleDarkTheme}
                title={t.quickThemeTitle}
                aria-label={t.quickThemeTitle}
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title={t.logoutBtn}
                aria-label={t.logoutBtn}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t.logoutBtn}</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-3.5 sm:p-6 pb-24 lg:pb-6 max-w-7xl w-full mx-auto">{children}</main>

          {/* Barra de Navegación Inferior Móvil */}
          <nav
            aria-label="Navegación rápida móvil"
            className="mobile-bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
          >
            <div className="grid grid-cols-5 gap-1">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!active && !effectiveOnline ? 'Requiere conexión para cambiar de sección' : undefined}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[44px] rounded-lg text-[10px] font-semibold transition-colors ${
                      active ? 'text-brand-600 bg-brand-50/70' : 'text-slate-600 hover:text-slate-900'
                    } ${!active && !effectiveOnline ? 'opacity-60' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-full px-1">{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[44px] rounded-lg text-[10px] font-semibold transition-colors ${
                  isMoreRouteActive ? 'text-brand-600 bg-brand-50/70' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Menu className="w-4 h-4 shrink-0" />
                <span>Más</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  perfil,
  mode,
  children,
}: {
  perfil: PerfilUsuario;
  mode: 'supabase' | 'local';
  children: React.ReactNode;
}) {
  return (
    <PreferencesProvider>
      <SessionInactivityGuard enabled={true}>
        <AppShellInner perfil={perfil} mode={mode}>
          {children}
        </AppShellInner>
      </SessionInactivityGuard>
    </PreferencesProvider>
  );
}
