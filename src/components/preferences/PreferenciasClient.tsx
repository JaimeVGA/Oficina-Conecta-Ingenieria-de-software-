'use client';

import React, { useMemo, useState } from 'react';
import {
  Award,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Globe,
  Laptop,
  MapPin,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import {
  type AvatarPreset,
  type Locale,
  type ThemeMode,
  type UiDensity,
  getRegionLabel,
  usePreferences,
} from '@/components/preferences/PreferencesProvider';
import { UserAvatar } from '@/components/preferences/UserAvatar';
import { RoleBadge } from '@/components/layout/RoleBadge';
import type { Departamento, PerfilUsuario, RolUsuario, Sede } from '@/lib/supabase/types';

type PrefsTab = 'usuario' | 'temas' | 'idioma';

const AVATAR_PRESETS: { id: AvatarPreset; label: string; dotClass: string }[] = [
  { id: 'indigo', label: 'Índigo', dotClass: 'bg-indigo-600' },
  { id: 'ocean', label: 'Azul Océano', dotClass: 'bg-sky-600' },
  { id: 'emerald', label: 'Esmeralda', dotClass: 'bg-emerald-600' },
  { id: 'amber', label: 'Ámbar', dotClass: 'bg-amber-600' },
  { id: 'rose', label: 'Carmesí', dotClass: 'bg-rose-600' },
  { id: 'slate', label: 'Grafito', dotClass: 'bg-slate-700' },
];

const RBAC_PERMISSIONS_BY_ROLE: Record<RolUsuario, string[]> = {
  DN: [
    'Consulta transversal de todas las sedes, métricas y bitácora',
    'Resuelve prórrogas mayores a 5 días, cambios de alcance y solicitudes de gerentes',
    'Consulta global en modo supervisión sin edición directa de tareas locales',
  ],
  GS: [
    'Administra departamentos, proyectos, tareas y asignaciones de su sede',
    'Resuelve prórrogas locales de hasta 5 días dentro del fin del proyecto',
    'Sube versiones documentales y designa la Versión Oficial / Vigente',
  ],
  OP: [
    'Consulta y registra avances sobre sus tareas asignadas',
    'Sube revisiones documentales (v1, v2, v3) en sus tareas asignadas',
    'Emite solicitudes de prórroga de fecha o cambio de alcance',
  ],
};

export function PreferenciasClient({
  actor,
  usuariosVisibles,
  departamentos,
  sedes,
}: {
  actor: PerfilUsuario;
  usuariosVisibles: PerfilUsuario[];
  departamentos: Departamento[];
  sedes: Sede[];
}) {
  const {
    locale,
    theme,
    density,
    t,
    setLocale,
    setTheme,
    setDensity,
    getUserCustomization,
    updateUserCustomization,
    resetPreferences,
  } = usePreferences();

  const [activeTab, setActiveTab] = useState<PrefsTab>('usuario');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const actorDepto = departamentos.find((d) => d.id === actor.departamento_id)?.nombre ?? null;
  const actorCustom = getUserCustomization(actor.id, actor.rol, actorDepto);

  const [puestoDraft, setPuestoDraft] = useState(actorCustom.puestoPersonalizado);
  const [extDraft, setExtDraft] = useState(actorCustom.telefonoExtension);
  const [bioDraft, setBioDraft] = useState(actorCustom.biografiaOperativa);

  const showSaved = (msg?: string) => {
    setSavedNotice(msg ?? t.prefs.saveSuccess);
    window.setTimeout(() => setSavedNotice(null), 3500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setSavedNotice('Solo se permiten imágenes PNG, JPEG o WebP.');
      return;
    }
    if (file.size > 1_500_000) {
      setSavedNotice('La foto de perfil debe pesar máximo 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateUserCustomization(actor.id, { avatarDataUrl: reader.result }, actor.rol, actorDepto);
        showSaved('Foto de perfil actualizada localmente.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfileDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserCustomization(
      actor.id,
      {
        puestoPersonalizado: puestoDraft.trim() || actorCustom.puestoPersonalizado,
        telefonoExtension: extDraft.trim(),
        biografiaOperativa: bioDraft.trim(),
      },
      actor.rol,
      actorDepto
    );
    showSaved();
  };

  const directorySubtitle = useMemo(() => {
    if (actor.rol === 'DN') return t.prefs.directorySubtitleDN;
    if (actor.rol === 'GS') return t.prefs.directorySubtitleGS;
    return t.prefs.directorySubtitleOP;
  }, [actor.rol, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t.prefs.pageTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.prefs.pageSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetPreferences();
            showSaved();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {t.prefs.resetBtn}
        </button>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Pestañas de Preferencias */}
      <div className="flex overflow-x-auto no-scrollbar pb-3 -mx-1 px-1 sm:flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('usuario')}
          className={`whitespace-nowrap shrink-0 min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'usuario'
              ? 'bg-brand-600 text-white'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" /> {t.prefs.tabProfile}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('temas')}
          className={`whitespace-nowrap shrink-0 min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'temas'
              ? 'bg-brand-600 text-white'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Palette className="w-4 h-4" /> {t.prefs.tabTheme}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('idioma')}
          className={`whitespace-nowrap shrink-0 min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'idioma'
              ? 'bg-brand-600 text-white'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Globe className="w-4 h-4" /> {t.prefs.tabLanguage}
        </button>
      </div>

      {/* SECCIÓN 1: USUARIO Y DIRECTORIO */}
      {activeTab === 'usuario' && (
        <div className="space-y-6">
          {/* Ficha Principal del Usuario Autenticado */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  nombre={actor.nombre_completo}
                  avatarDataUrl={actorCustom.avatarDataUrl}
                  preset={actorCustom.avatarPreset}
                  size="lg"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{actor.nombre_completo}</h2>
                    <RoleBadge rol={actor.rol} />
                  </div>
                  <p className="text-sm font-medium text-brand-600">{actorCustom.puestoPersonalizado}</p>
                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" /> {t.rankLabels[actor.rol]}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {getRegionLabel(actor.sede_id, locale)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Controles de Foto / Avatar */}
              <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                <label className="flex-1 sm:flex-initial justify-center min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t.prefs.uploadPhoto}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoUpload} className="hidden" />
                </label>

                {actorCustom.avatarDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateUserCustomization(actor.id, { avatarDataUrl: null }, actor.rol, actorDepto);
                      showSaved('Foto eliminada.');
                    }}
                    className="flex-1 sm:flex-initial justify-center min-h-[40px] inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t.prefs.removePhoto}
                  </button>
                )}
              </div>
            </div>

            {/* Selector de Color de Avatar */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">{t.prefs.presetLabel}:</span>
              <div className="flex flex-wrap items-center gap-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      updateUserCustomization(actor.id, { avatarPreset: preset.id }, actor.rol, actorDepto);
                      showSaved();
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                      actorCustom.avatarPreset === preset.id
                        ? 'border-brand-600 bg-brand-50 text-brand-900 font-semibold'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${preset.dotClass}`} />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Metadatos de Cuenta y Formulario Editable Local */}
            <form onSubmit={handleSaveProfileDetails} className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{t.prefs.fieldName}</p>
                <p className="text-sm font-semibold text-slate-900">{actor.nombre_completo}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{t.prefs.fieldEmail}</p>
                <p className="text-sm font-mono text-slate-900 break-all">{actor.correo}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{t.prefs.fieldRank}</p>
                <p className="text-sm font-semibold text-slate-900">{t.rankLabels[actor.rol]}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{t.prefs.fieldRegion}</p>
                <p className="text-sm font-semibold text-slate-900">{getRegionLabel(actor.sede_id, locale)}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{t.prefs.fieldDepartment}</p>
                <p className="text-sm font-semibold text-slate-900">
                  {actorDepto ?? 'Cobertura Transversal Nacional'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.prefs.fieldRole}</label>
                <input
                  type="text"
                  value={puestoDraft}
                  onChange={(e) => setPuestoDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.prefs.fieldExtension}</label>
                <input
                  type="text"
                  value={extDraft}
                  onChange={(e) => setExtDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.prefs.fieldBio}</label>
                <input
                  type="text"
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto justify-center min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
                >
                  <Check className="w-4 h-4" /> {t.prefs.saveProfileBtn}
                </button>
              </div>
            </form>

            {/* Matriz de Permisos Activos */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> {t.prefs.fieldPermissions}
              </h3>
              <ul className="space-y-1 text-xs text-slate-700">
                {RBAC_PERMISSIONS_BY_ROLE[actor.rol].map((perm) => (
                  <li key={perm} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Directorio de Usuarios Visibles en el Alcance RBAC */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" /> {t.prefs.directoryTitle} ({usuariosVisibles.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{directorySubtitle}</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {usuariosVisibles.map((u) => {
                const depto = departamentos.find((d) => d.id === u.departamento_id)?.nombre ?? null;
                const sede = sedes.find((s) => s.id === u.sede_id);
                const custom = getUserCustomization(u.id, u.rol, depto);
                const isSelf = u.id === actor.id;

                return (
                  <div
                    key={u.id}
                    className={`border rounded-xl p-4 space-y-3 ${
                      isSelf ? 'border-brand-500 bg-brand-50/40' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        nombre={u.nombre_completo}
                        avatarDataUrl={custom.avatarDataUrl}
                        preset={custom.avatarPreset}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-sm text-slate-900 truncate">{u.nombre_completo}</p>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded bg-brand-600 text-white text-[10px] font-bold">
                              TÚ
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-brand-700 truncate">{custom.puestoPersonalizado}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{u.correo}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-700 border-t border-slate-200 pt-2.5">
                      <p>
                        <strong>Rango:</strong> {t.rankLabels[u.rol]}
                      </p>
                      <p className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>
                          {sede ? `${sede.nombre} (${sede.codigo_corto})` : 'Nacional — Todas las sedes'}
                        </span>
                      </p>
                      <p>
                        <strong>Región:</strong> {getRegionLabel(u.sede_id, locale)}
                      </p>
                      <p>
                        <strong>Depto:</strong> {depto ?? 'Dirección General'}
                      </p>
                      <p className="text-[11px] text-slate-500">{custom.telefonoExtension}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: TEMAS Y APARIENCIA */}
      {activeTab === 'temas' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t.prefs.themeSectionTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.prefs.themeSectionSubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(
              [
                {
                  id: 'light' as ThemeMode,
                  title: 'Claro Institucional',
                  desc: 'Superficies blancas de alto contraste para jornadas diurnas.',
                  icon: Sun,
                  previewBg: 'bg-slate-50 border-slate-300',
                  previewCard: 'bg-white border-slate-200 text-slate-900',
                },
                {
                  id: 'dark' as ThemeMode,
                  title: 'Oscuro Nocturno',
                  desc: 'Reduce fatiga visual con fondo pizarra profundo y alto contraste.',
                  icon: Moon,
                  previewBg: 'bg-slate-950 border-slate-800',
                  previewCard: 'bg-slate-900 border-slate-700 text-slate-100',
                },
                {
                  id: 'midnight' as ThemeMode,
                  title: 'Azul Corporativo Oscuro',
                  desc: 'Paleta nocturna azul marino inspirada en tableros de operaciones.',
                  icon: Palette,
                  previewBg: 'bg-[#071324] border-[#1e3a5f]',
                  previewCard: 'bg-[#0f213c] border-[#254b7a] text-sky-100',
                },
                {
                  id: 'system' as ThemeMode,
                  title: 'Automático del Sistema',
                  desc: 'Se adapta automáticamente al tema claro/oscuro de tu SO.',
                  icon: Laptop,
                  previewBg: 'bg-gradient-to-r from-slate-100 to-slate-900 border-slate-400',
                  previewCard: 'bg-white/90 border-slate-300 text-slate-900',
                },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const selected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    showSaved();
                  }}
                  className={`text-left rounded-xl border-2 p-4 space-y-3 transition-all ${
                    selected ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`rounded-lg border p-3 ${opt.previewBg}`}>
                    <div className={`rounded border p-2 text-[10px] font-semibold ${opt.previewCard}`}>
                      Oficina Conecta · UI
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-brand-600" /> {opt.title}
                    </span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{t.prefs.densitySectionTitle}</h3>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'compact' as UiDensity, label: 'Compacta (Mayor densidad)' },
                  { id: 'normal' as UiDensity, label: 'Normal (Recomendada)' },
                  { id: 'comfortable' as UiDensity, label: 'Amplia (Lectura cómoda)' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDensity(d.id);
                    showSaved();
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                    density === d.id
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: IDIOMA DE LA INTERFAZ */}
      {activeTab === 'idioma' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t.prefs.languageSectionTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.prefs.languageSectionSubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {(
              [
                {
                  id: 'es-MX' as Locale,
                  name: 'Español (México)',
                  code: 'es-MX',
                  note: 'Idioma predeterminado · America/Mexico_City',
                },
                {
                  id: 'en-US' as Locale,
                  name: 'English (United States)',
                  code: 'en-US',
                  note: 'International English UI labels and role badges',
                },
                {
                  id: 'pt-BR' as Locale,
                  name: 'Português (Brasil)',
                  code: 'pt-BR',
                  note: 'Interface em português para operação regional',
                },
              ] as const
            ).map((lang) => {
              const selected = locale === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => {
                    setLocale(lang.id);
                    showSaved();
                  }}
                  className={`text-left rounded-xl border-2 p-4 space-y-2 transition-all ${
                    selected ? 'border-brand-600 bg-brand-50/40' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                      {lang.code}
                    </span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                  </div>
                  <p className="font-bold text-sm text-slate-900">{lang.name}</p>
                  <p className="text-xs text-slate-500">{lang.note}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
