'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { RolUsuario, SedeId } from '@/lib/supabase/types';

export type Locale = 'es-MX' | 'en-US' | 'pt-BR';
export type ThemeMode = 'light' | 'dark' | 'midnight' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'midnight';
export type UiDensity = 'compact' | 'normal' | 'comfortable';

export type AvatarPreset = 'ocean' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';

export interface UserProfileCustomization {
  avatarDataUrl: string | null;
  avatarPreset: AvatarPreset;
  puestoPersonalizado: string;
  telefonoExtension: string;
  biografiaOperativa: string;
}

export interface StoredPreferences {
  locale: Locale;
  theme: ThemeMode;
  density: UiDensity;
  userCustomizations: Record<string, UserProfileCustomization>;
}

const STORAGE_KEY = 'oc_preferences_v1';

const DEFAULT_PREFERENCES: StoredPreferences = {
  locale: 'es-MX',
  theme: 'light',
  density: 'normal',
  userCustomizations: {},
};

export interface RoleMetadata {
  rangoNivel: string;
  puestoDefault: string;
  permisosResumen: string[];
}

export function getDefaultProfileCustomization(
  rol: RolUsuario,
  departamentoNombre?: string | null
): UserProfileCustomization {
  const deptoSuffix = departamentoNombre ? ` — ${departamentoNombre}` : '';
  const puestoByRol: Record<RolUsuario, string> = {
    DN: 'Director Nacional de Operaciones',
    GS: `Gerente Regional de Sede${deptoSuffix}`,
    OP: `Especialista Operativo${deptoSuffix}`,
  };
  const bioByRol: Record<RolUsuario, string> = {
    DN: 'Supervisión transversal nacional, indicadores multisede y resolución de escalamientos extraordinarios.',
    GS: 'Administración de proyectos, tareas, prórrogas locales (≤5 días) y designación de versiones documentales vigentes.',
    OP: 'Ejecución de tareas asignadas, carga de avances, revisión documental y solicitud de prórrogas.',
  };
  const presetByRol: Record<RolUsuario, AvatarPreset> = {
    DN: 'indigo',
    GS: 'ocean',
    OP: 'emerald',
  };
  const extByRol: Record<RolUsuario, string> = {
    DN: 'Ext. 1001 — Dirección Nacional',
    GS: 'Ext. 2100 — Gerencia Regional',
    OP: 'Ext. 3200 — Mesa Operativa',
  };

  return {
    avatarDataUrl: null,
    avatarPreset: presetByRol[rol],
    puestoPersonalizado: puestoByRol[rol],
    telefonoExtension: extByRol[rol],
    biografiaOperativa: bioByRol[rol],
  };
}

export function getRegionLabel(sedeId: SedeId | null, locale: Locale): string {
  const map: Record<Locale, Record<'NATIONAL' | SedeId, string>> = {
    'es-MX': {
      NATIONAL: 'Cobertura Multisede Nacional',
      CDMX: 'Región Centro — Ciudad de México (CDMX)',
      OAXACA: 'Región Sur-Sureste — Oaxaca de Juárez (OAX)',
      PUEBLA: 'Región Centro-Oriente — Puebla de Zaragoza (PUE)',
    },
    'en-US': {
      NATIONAL: 'National Multi-Site Coverage',
      CDMX: 'Central Region — Mexico City (CDMX)',
      OAXACA: 'South-Southeast Region — Oaxaca de Juárez (OAX)',
      PUEBLA: 'Central-East Region — Puebla de Zaragoza (PUE)',
    },
    'pt-BR': {
      NATIONAL: 'Cobertura Nacional Multissede',
      CDMX: 'Região Centro — Cidade do México (CDMX)',
      OAXACA: 'Região Sul-Sudeste — Oaxaca de Juárez (OAX)',
      PUEBLA: 'Região Centro-Leste — Puebla de Zaragoza (PUE)',
    },
  };
  return map[locale][sedeId ?? 'NATIONAL'];
}

export const TRANSLATIONS = {
  'es-MX': {
    appSubtitle: 'Gestión Multisede',
    navDashboard: 'Tablero Principal',
    navTasks: 'Tareas y Calendario (.ics)',
    navProjects: 'Sedes, Deptos y Proyectos',
    navAuthorizations: 'Autorizaciones',
    navAuditLog: 'Bitácora',
    navNotifications: 'Notificaciones',
    navPreferences: 'Preferencias y Perfil',
    envLabel: 'Entorno',
    tzLabel: 'Zona horaria',
    nationalScope: 'Todas las Sedes (Nacional)',
    logoutBtn: 'Cerrar sesión',
    quickThemeTitle: 'Cambiar tema claro/oscuro',
    roleLabels: {
      OP: 'Personal Operativo (OP)',
      GS: 'Gerencia de Sede (GS)',
      DN: 'Dirección Nacional (DN)',
    },
    rankLabels: {
      OP: 'Rango Operativo · Nivel 3',
      GS: 'Rango Gerencial · Nivel 2',
      DN: 'Rango Directivo Nacional · Nivel 1',
    },
    prefs: {
      pageTitle: 'Preferencias del Sistema, Temas y Perfil de Usuario',
      pageSubtitle:
        'Configure el idioma de la interfaz, tema visual (claro u oscuro) y consulte la ficha y directorio de usuarios.',
      tabProfile: 'Usuario y Directorio',
      tabTheme: 'Temas y Apariencia',
      tabLanguage: 'Idioma de la Interfaz',
      saveSuccess: 'Preferencias guardadas localmente en este navegador.',
      resetBtn: 'Restaurar predeterminados',
      activeAccountTitle: 'Ficha de la Cuenta Autenticada',
      uploadPhoto: 'Subir foto (PNG/JPG)',
      removePhoto: 'Quitar foto',
      presetLabel: 'Color / estilo de avatar',
      fieldName: 'Nombre completo',
      fieldEmail: 'Correo institucional',
      fieldRank: 'Rango jerárquico',
      fieldRole: 'Puesto / Cargo',
      fieldRegion: 'Región y Sede operativa',
      fieldDepartment: 'Departamento asignado',
      fieldExtension: 'Extensión interna',
      fieldBio: 'Resumen de responsabilidades',
      fieldPermissions: 'Permisos activos',
      saveProfileBtn: 'Guardar ficha de perfil',
      directoryTitle: 'Directorio de Usuarios',
      directorySubtitleDN: 'Dirección Nacional: visibilidad transversal de las sedes activas.',
      directorySubtitleGS: 'Gerencia de Sede: colaboradores de tu sede operativa.',
      directorySubtitleOP: 'Personal Operativo: acceso exclusivo a tu cuenta.',
      themeSectionTitle: 'Tema Visual de la Interfaz',
      themeSectionSubtitle:
        'Seleccione el modo claro u oscuro para toda la plataforma. Tu preferencia se conserva automáticamente.',
      densitySectionTitle: 'Densidad de Espaciado',
      languageSectionTitle: 'Idioma Predeterminado de la Interfaz',
      languageSectionSubtitle:
        'El idioma seleccionado actualiza menús, encabezados, etiquetas de rol y controles de preferencias al instante.',
    },
  },
  'en-US': {
    appSubtitle: 'Multi-Site Management',
    navDashboard: 'Main Dashboard',
    navTasks: 'Tasks & Calendar (.ics)',
    navProjects: 'Sites, Depts & Projects',
    navAuthorizations: 'Authorizations',
    navAuditLog: 'Audit Log',
    navNotifications: 'Notifications',
    navPreferences: 'Preferences & Profile',
    envLabel: 'Environment',
    tzLabel: 'Time zone',
    nationalScope: 'All Offices (National)',
    logoutBtn: 'Sign out',
    quickThemeTitle: 'Toggle light/dark theme',
    roleLabels: {
      OP: 'Operational Staff (OP)',
      GS: 'Site Manager (GS)',
      DN: 'National Director (DN)',
    },
    rankLabels: {
      OP: 'Operational Rank · Tier 3',
      GS: 'Regional Management Rank · Tier 2',
      DN: 'National Executive Rank · Tier 1',
    },
    prefs: {
      pageTitle: 'System Preferences, Themes & User Profile',
      pageSubtitle:
        'Configure the interface language, switch between light and dark themes, and view your user profile and directory.',
      tabProfile: 'User & Directory',
      tabTheme: 'Themes & Appearance',
      tabLanguage: 'Interface Language',
      saveSuccess: 'Preferences saved locally in this browser.',
      resetBtn: 'Reset to defaults',
      activeAccountTitle: 'Authenticated Account Details',
      uploadPhoto: 'Upload photo (PNG/JPG)',
      removePhoto: 'Remove photo',
      presetLabel: 'Avatar style / color',
      fieldName: 'Full name',
      fieldEmail: 'Corporate email',
      fieldRank: 'Hierarchical rank',
      fieldRole: 'Job title / Position',
      fieldRegion: 'Region & Operational Site',
      fieldDepartment: 'Assigned department',
      fieldExtension: 'Internal extension',
      fieldBio: 'Role responsibilities summary',
      fieldPermissions: 'Active Permissions',
      saveProfileBtn: 'Save profile details',
      directoryTitle: 'User Directory',
      directorySubtitleDN: 'National Directorate: cross-site visibility across all active offices.',
      directorySubtitleGS: 'Site Management: team members belonging to your local office.',
      directorySubtitleOP: 'Operational Staff: access restricted to your own account.',
      themeSectionTitle: 'Interface Visual Theme',
      themeSectionSubtitle:
        'Choose between light and dark modes across the entire platform. Your preference is saved automatically.',
      densitySectionTitle: 'Layout Spacing Density',
      languageSectionTitle: 'Default Interface Language',
      languageSectionSubtitle:
        'The selected language updates navigation menus, headers, role badges, and preference panels immediately.',
    },
  },
  'pt-BR': {
    appSubtitle: 'Gestão Multissede',
    navDashboard: 'Painel Principal',
    navTasks: 'Tarefas e Calendário (.ics)',
    navProjects: 'Unidades, Deptos e Projetos',
    navAuthorizations: 'Autorizações',
    navAuditLog: 'Auditoria',
    navNotifications: 'Notificações',
    navPreferences: 'Preferências e Perfil',
    envLabel: 'Ambiente',
    tzLabel: 'Fuso horário',
    nationalScope: 'Todas as Unidades (Nacional)',
    logoutBtn: 'Encerrar sessão',
    quickThemeTitle: 'Alternar tema claro/escuro',
    roleLabels: {
      OP: 'Equipe Operacional (OP)',
      GS: 'Gerência de Unidade (GS)',
      DN: 'Diretoria Nacional (DN)',
    },
    rankLabels: {
      OP: 'Nível Operacional · Grau 3',
      GS: 'Nível Gerencial Regional · Grau 2',
      DN: 'Nível Diretivo Nacional · Grau 1',
    },
    prefs: {
      pageTitle: 'Preferências do Sistema, Temas e Perfil de Usuário',
      pageSubtitle:
        'Defina o idioma da interface, alterne entre tema claro e escuro e consulte os dados da conta e diretório.',
      tabProfile: 'Usuário e Diretório',
      tabTheme: 'Temas e Aparência',
      tabLanguage: 'Idioma da Interface',
      saveSuccess: 'Preferências salvas localmente neste navegador.',
      resetBtn: 'Restaurar padrões',
      activeAccountTitle: 'Ficha da Conta Autenticada',
      uploadPhoto: 'Enviar foto (PNG/JPG)',
      removePhoto: 'Remover foto',
      presetLabel: 'Estilo / cor do avatar',
      fieldName: 'Nome completo',
      fieldEmail: 'E-mail institucional',
      fieldRank: 'Nível hierárquico',
      fieldRole: 'Cargo / Função',
      fieldRegion: 'Região e Unidade operativa',
      fieldDepartment: 'Departamento atribuído',
      fieldExtension: 'Ramal interno',
      fieldBio: 'Resumo de responsabilidades',
      fieldPermissions: 'Permissões ativas',
      saveProfileBtn: 'Salvar ficha do perfil',
      directoryTitle: 'Diretório de Usuários',
      directorySubtitleDN: 'Diretoria Nacional: visão transversal das unidades ativas.',
      directorySubtitleGS: 'Gerência de Unidade: colaboradores da sua própria sede.',
      directorySubtitleOP: 'Equipe Operacional: acesso restrito à sua própria conta.',
      themeSectionTitle: 'Tema Visual da Interface',
      themeSectionSubtitle:
        'Escolha entre modo claro e escuro em toda a plataforma. Sua preferência é salva automaticamente.',
      densitySectionTitle: 'Densidade de Espaçamento',
      languageSectionTitle: 'Idioma Padrão da Interface',
      languageSectionSubtitle:
        'O idioma escolhido atualiza menus, cabeçalhos, selos de função e painéis de preferências imediatamente.',
    },
  },
} as const;

export type TranslationBundle = (typeof TRANSLATIONS)[Locale];

interface PreferencesContextValue {
  locale: Locale;
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  density: UiDensity;
  t: TranslationBundle;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: UiDensity) => void;
  toggleDarkTheme: () => void;
  getUserCustomization: (
    userId: string,
    rol: RolUsuario,
    departamentoNombre?: string | null
  ) => UserProfileCustomization;
  updateUserCustomization: (
    userId: string,
    patch: Partial<UserProfileCustomization>,
    rol: RolUsuario,
    departamentoNombre?: string | null
  ) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  locale: 'es-MX',
  theme: 'light',
  resolvedTheme: 'light',
  density: 'normal',
  t: TRANSLATIONS['es-MX'],
  setLocale: () => {},
  setTheme: () => {},
  setDensity: () => {},
  toggleDarkTheme: () => {},
  getUserCustomization: (_id, rol, depto) => getDefaultProfileCustomization(rol, depto),
  updateUserCustomization: () => {},
  resetPreferences: () => {},
});

export function usePreferences() {
  return useContext(PreferencesContext);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPreferences>(DEFAULT_PREFERENCES);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Cargar preferencias de localStorage solo tras montar en cliente (evita mismatch SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
        setPrefs({
          locale: parsed.locale && parsed.locale in TRANSLATIONS ? parsed.locale : 'es-MX',
          theme:
            parsed.theme && ['light', 'dark', 'midnight', 'system'].includes(parsed.theme)
              ? parsed.theme
              : 'light',
          density:
            parsed.density && ['compact', 'normal', 'comfortable'].includes(parsed.density)
              ? parsed.density
              : 'normal',
          userCustomizations: parsed.userCustomizations ?? {},
        });
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (media) {
      setSystemPrefersDark(media.matches);
      const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
      media.addEventListener('change', handler);
      setHydrated(true);
      return () => media.removeEventListener('change', handler);
    }
    setHydrated(true);
  }, []);

  const persistPrefs = useCallback((updater: (prev: StoredPreferences) => StoredPreferences) => {
    setPrefs((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignorar
      }
      return next;
    });
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (prefs.theme === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return prefs.theme;
  }, [prefs.theme, systemPrefersDark]);

  // Aplicar tema, densidad e idioma al elemento raíz <html>
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.density = prefs.density;
    root.lang = prefs.locale;
  }, [resolvedTheme, prefs.density, prefs.locale, hydrated]);

  const setLocale = useCallback(
    (locale: Locale) => persistPrefs((prev) => ({ ...prev, locale })),
    [persistPrefs]
  );

  const setTheme = useCallback(
    (theme: ThemeMode) => persistPrefs((prev) => ({ ...prev, theme })),
    [persistPrefs]
  );

  const setDensity = useCallback(
    (density: UiDensity) => persistPrefs((prev) => ({ ...prev, density })),
    [persistPrefs]
  );

  const toggleDarkTheme = useCallback(() => {
    persistPrefs((prev) => {
      const currentlyDark =
        prev.theme === 'dark' ||
        prev.theme === 'midnight' ||
        (prev.theme === 'system' && systemPrefersDark);
      return { ...prev, theme: currentlyDark ? 'light' : 'dark' };
    });
  }, [persistPrefs, systemPrefersDark]);

  const getUserCustomization = useCallback(
    (userId: string, rol: RolUsuario, departamentoNombre?: string | null): UserProfileCustomization => {
      const defaults = getDefaultProfileCustomization(rol, departamentoNombre);
      const saved = prefs.userCustomizations[userId];
      if (!saved) return defaults;
      return {
        ...defaults,
        ...saved,
      };
    },
    [prefs.userCustomizations]
  );

  const updateUserCustomization = useCallback(
    (
      userId: string,
      patch: Partial<UserProfileCustomization>,
      rol: RolUsuario,
      departamentoNombre?: string | null
    ) => {
      persistPrefs((prev) => {
        const current = prev.userCustomizations[userId] ?? getDefaultProfileCustomization(rol, departamentoNombre);
        return {
          ...prev,
          userCustomizations: {
            ...prev.userCustomizations,
            [userId]: { ...current, ...patch },
          },
        };
      });
    },
    [persistPrefs]
  );

  const resetPreferences = useCallback(() => {
    persistPrefs(() => DEFAULT_PREFERENCES);
  }, [persistPrefs]);

  return (
    <PreferencesContext.Provider
      value={{
        locale: prefs.locale,
        theme: prefs.theme,
        resolvedTheme,
        density: prefs.density,
        t: TRANSLATIONS[prefs.locale],
        setLocale,
        setTheme,
        setDensity,
        toggleDarkTheme,
        getUserCustomization,
        updateUserCustomization,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
