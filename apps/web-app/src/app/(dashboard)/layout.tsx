import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/dashboard-shell';
import type { AuthUser, AuthTenant } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const userRaw = cookieStore.get('pipevitta_user')?.value;
  const tenantRaw = cookieStore.get('pipevitta_tenant')?.value;

  let user: AuthUser | null = null;
  let tenant: AuthTenant | null = null;

  try {
    if (userRaw) user = JSON.parse(decodeURIComponent(userRaw));
  } catch {
    /* corrupted cookie — treat as null */
  }

  try {
    if (tenantRaw) tenant = JSON.parse(decodeURIComponent(tenantRaw));
  } catch {
    /* corrupted cookie — treat as null */
  }

  return (
    <DashboardShell user={user} tenant={tenant}>
      {children}
    </DashboardShell>
  );
}
