'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  CheckSquare,
  Clock,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldAlert,
  Sun,
  Wifi,
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

function AppShellInner({
  perfil,
  mode,
  children,
}: {
  perfil: PerfilUsuario;
  mode: 'supabase' | 'local';
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    effectiveOnline,
    simulatedOffline,
    setSimulatedOffline,
    simulateInactivityWarning,
    simulateInactivityExpiry,
  } = useSessionGuard();
  const { t, locale, resolvedTheme, toggleDarkTheme, getUserCustomization } = usePreferences();

  const demoToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS !== 'false';
  const customization = getUserCustomization(perfil.id, perfil.rol);
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'midnight';

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
    try {
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        await supabase?.auth.signOut({ scope: 'local' });
      }
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>{t.envLabel}:</span>
              <span className="font-mono text-slate-200">
                {mode === 'supabase' ? 'Supabase us-east-1' : 'Motor Local ACID'}
              </span>
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
            <div className="relative w-64 bg-slate-900 text-slate-100 flex flex-col z-50">
              <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <span className="font-semibold text-sm">Oficina Conecta</span>
                <button type="button" onClick={() => setMobileOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link
                href="/preferencias"
                className="flex items-center gap-2.5 group"
                title={t.navPreferences}
              >
                <UserAvatar
                  nombre={perfil.nombre_completo}
                  avatarDataUrl={customization.avatarDataUrl}
                  preset={customization.avatarPreset}
                  size="sm"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm group-hover:underline">
                      {perfil.nombre_completo}
                    </span>
                    <RoleBadge rol={perfil.rol} />
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Building2 className="w-3.5 h-3.5" />
                      {perfil.sede_id ? getRegionLabel(perfil.sede_id, locale) : t.nationalScope}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {customization.puestoPersonalizado} · {perfil.correo}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleDarkTheme}
                title={t.quickThemeTitle}
                aria-label={t.quickThemeTitle}
                className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {demoToolsEnabled && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                  <span className="text-[11px] font-semibold text-slate-600 px-1">Pruebas CP-003:</span>
                  <button
                    type="button"
                    onClick={() => setSimulatedOffline(!simulatedOffline)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      effectiveOnline
                        ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        : 'bg-red-600 text-white'
                    }`}
                    title="Simular corte de conexión a internet"
                  >
                    {effectiveOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    {effectiveOnline ? 'Simular Sin Red' : 'Restablecer Red'}
                  </button>
                  <button
                    type="button"
                    onClick={simulateInactivityWarning}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-900 hover:bg-amber-200"
                    title="Simular 13 minutos de inactividad"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    13m
                  </button>
                  <button
                    type="button"
                    onClick={simulateInactivityExpiry}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-900 hover:bg-red-200"
                    title="Simular 15 minutos de inactividad y purga de sessionStorage"
                  >
                    15m
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                {t.logoutBtn}
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
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
