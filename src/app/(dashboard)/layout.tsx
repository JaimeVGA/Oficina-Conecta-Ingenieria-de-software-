import { redirect } from 'next/navigation';
import { getBackendMode, getCurrentActor } from '@/lib/backend/adapter';
import { AppShell } from '@/components/layout/AppShell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect('/login');
  }
  const mode = getBackendMode();
  return (
    <AppShell perfil={actor} mode={mode}>
      {children}
    </AppShell>
  );
}
