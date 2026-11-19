import type { AvatarPreset } from '@/components/preferences/PreferencesProvider';

const PRESET_CLASSES: Record<AvatarPreset, string> = {
  ocean: 'bg-sky-600 text-white',
  indigo: 'bg-indigo-600 text-white',
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-600 text-white',
  rose: 'bg-rose-600 text-white',
  slate: 'bg-slate-700 text-white',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OC';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export function UserAvatar({
  nombre,
  avatarDataUrl,
  preset = 'indigo',
  size = 'md',
}: {
  nombre: string;
  avatarDataUrl?: string | null;
  preset?: AvatarPreset;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-11 h-11 text-sm';

  if (avatarDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarDataUrl}
        alt={`Foto de ${nombre}`}
        className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-sm shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${PRESET_CLASSES[preset]} rounded-full flex items-center justify-center font-bold shadow-sm shrink-0`}
      aria-label={`Avatar de ${nombre}`}
    >
      {getInitials(nombre)}
    </div>
  );
}
