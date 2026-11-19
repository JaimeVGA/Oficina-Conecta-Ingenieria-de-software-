'use client';

import type { RolUsuario } from '@/lib/supabase/types';
import { usePreferences } from '@/components/preferences/PreferencesProvider';

const ROLE_CLASSES: Record<RolUsuario, string> = {
  OP: 'bg-sky-100 text-sky-800 border-sky-200',
  GS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  DN: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function RoleBadge({ rol }: { rol: RolUsuario }) {
  const { t } = usePreferences();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_CLASSES[rol]}`}>
      {t.roleLabels[rol]}
    </span>
  );
}
