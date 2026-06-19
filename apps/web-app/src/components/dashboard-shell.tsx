'use client';

import { useState, type ReactNode } from 'react';
import type { AuthUser, AuthTenant } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface DashboardShellProps {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  children: ReactNode;
}

export function DashboardShell({ user, tenant, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden antialiased">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div
        className={`
          flex-1 flex flex-col min-w-0 transition-all duration-200
          ${collapsed ? 'ml-20' : 'ml-64'}
        `}
      >
        <Topbar user={user} tenant={tenant} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
