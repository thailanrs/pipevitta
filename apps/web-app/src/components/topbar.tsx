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
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  // Focus palette input on open
  useEffect(() => {
    if (isPaletteOpen && paletteInputRef.current) {
      paletteInputRef.current.focus();
    }
  }, [isPaletteOpen]);

  // Command palette keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setIsPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <div className="flex items-center gap-6 flex-1 justify-start">
        <h2 className="text-lg font-bold text-on-surface tracking-tight">
          {tenant?.name ?? 'PipeVitta'}
        </h2>
      </div>

      {/* Center Section: Search bar trigger */}
      <div className="flex-grow max-w-md w-full mx-4 hidden md:block">
        <div
          onClick={() => setIsPaletteOpen(true)}
          className="relative w-full cursor-pointer group"
        >
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/60 group-hover:text-primary text-xl transition-colors">
            search
          </span>
          <div
            className="
              w-full pl-10 pr-12 py-2 bg-surface-container-low border border-outline-variant/30 rounded-full
              text-sm text-outline/60 flex items-center justify-between transition-all group-hover:border-outline/50
            "
          >
            <span>Buscar pacientes, leads, agenda...</span>
            <span className="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-outline border border-outline-variant/50">⌘K</span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3 flex-1 justify-end">
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
            <span className="material-symbols-outlined text-lg text-outline">
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
                  <span className="material-symbols-outlined text-xl">logout</span>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Command Palette Modal */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm">
          {/* Backdrop click close */}
          <div className="absolute inset-0" onClick={() => setIsPaletteOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden mt-20 flex flex-col max-h-[400px]">
            {/* Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/25">
              <span className="material-symbols-outlined text-primary text-2xl">search</span>
              <input
                ref={paletteInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="O que você deseja buscar hoje?"
                className="flex-1 bg-transparent border-0 outline-none text-sm text-on-surface placeholder:text-outline/50 ring-0 focus:ring-0"
              />
              <button 
                onClick={() => setIsPaletteOpen(false)}
                className="text-[10px] bg-surface-container-high text-on-surface-variant border border-outline-variant/50 px-2 py-1 rounded cursor-pointer animate-none"
              >
                ESC
              </button>
            </div>

            {/* Results / Navigation list */}
            <div className="flex-1 overflow-y-auto p-2">
              {searchQuery ? (
                <div className="space-y-1">
                  <p className="text-xs text-outline font-semibold px-3 py-1.5 uppercase tracking-wider">Resultados da busca</p>
                  <button
                    onClick={() => {
                      setIsPaletteOpen(false);
                      router.push(`/patients?search=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-outline">person</span>
                    <span>Buscar <strong className="text-on-surface font-semibold">&quot;{searchQuery}&quot;</strong> em Pacientes</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPaletteOpen(false);
                      router.push(`/crm?search=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-outline">groups</span>
                    <span>Buscar <strong className="text-on-surface font-semibold">&quot;{searchQuery}&quot;</strong> no CRM Leads</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-outline font-semibold px-3 py-1.5 uppercase tracking-wider">Ações Rápidas</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsPaletteOpen(false);
                          router.push('/patients?action=create');
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container-high transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-outline text-xl">person_add</span>
                        <span>Cadastrar Novo Paciente</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsPaletteOpen(false);
                          router.push('/agenda?action=create');
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container-high transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-outline text-xl">event</span>
                        <span>Agendar Nova Consulta</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-outline font-semibold px-3 py-1.5 uppercase tracking-wider">Navegação rápida</p>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      <button
                        onClick={() => { setIsPaletteOpen(false); router.push('/agenda'); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">calendar_today</span>
                        <span>Agenda Multi-recursos</span>
                      </button>
                      <button
                        onClick={() => { setIsPaletteOpen(false); router.push('/crm'); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">groups</span>
                        <span>CRM Pipeline Kanban</span>
                      </button>
                      <button
                        onClick={() => { setIsPaletteOpen(false); router.push('/patients'); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">person</span>
                        <span>Listagem de Pacientes</span>
                      </button>
                      <button
                        onClick={() => { setIsPaletteOpen(false); router.push('/'); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">dashboard</span>
                        <span>Painel do Dashboard</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
