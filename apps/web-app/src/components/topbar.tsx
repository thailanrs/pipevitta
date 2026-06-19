'use client';

import type { AuthUser, AuthTenant } from '@/lib/auth';
import { clearAuthCookies } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

interface TopbarProps {
  user: AuthUser | null;
  tenant: AuthTenant | null;
}

export function Topbar({ user, tenant }: TopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    clearAuthCookies();
    router.push('/login');
  }

  /** Extract initials from user name (max 2 chars). */
  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <header
      className={`
        bg-surface/80 backdrop-blur-md border-b border-outline-variant/30
        h-16 sticky top-0 z-40
        flex items-center justify-between px-6
        transition-all duration-200
      `}
    >
      {/* Left Section */}
      <div className="flex items-center gap-6 flex-1">
        <h2 className="text-lg font-bold text-on-surface tracking-tight">
          {tenant?.name ?? 'PipeVitta'}
        </h2>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-outline-variant/50 hidden md:block" />

        {/* Search bar */}
        <div className="relative max-w-md w-full hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar pacientes, conversas ou agendamentos..."
            className="
              w-full pl-10 pr-4 py-2
              bg-surface-container-low border border-outline-variant/30 rounded-full
              text-sm text-on-surface placeholder:text-outline/60
              focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary
              outline-none transition-all shadow-inner
            "
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all relative group cursor-pointer"
          title="Notificações"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-error rounded-full ring-2 ring-surface" />
        </button>

        {/* Help */}
        <button
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all cursor-pointer"
          title="Ajuda"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>

        {/* Separator */}
        <div className="h-8 w-[1px] bg-outline-variant/30 mx-1" />

        {/* User profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-surface-container-high transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs border border-primary/10 shadow-sm">
              {user ? getInitials(user.name) : '??'}
            </div>
            <span className="text-sm font-medium text-on-surface hidden md:inline">
              {user?.name ?? 'Usuário'}
            </span>
            <span className="material-symbols-outlined text-[18px] text-outline">
              keyboard_arrow_down
            </span>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute top-full mt-2 right-0 bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-xl w-56 z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-outline-variant/20">
                <p className="text-sm font-semibold text-on-surface truncate">{user?.name}</p>
                <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                <p className="text-xs text-outline mt-1 truncate">{tenant?.name}</p>
              </div>

              {/* Menu actions */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
