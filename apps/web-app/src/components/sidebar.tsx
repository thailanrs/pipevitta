'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', href: '/' },
  { label: 'Agenda', icon: 'calendar_today', href: '/agenda' },
  { label: 'CRM', icon: 'groups', href: '/crm' },
  { label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { label: 'Pacientes', icon: 'person', href: '/patients' },
  { label: 'Financeiro', icon: 'payments', href: '/financial' },
  { label: 'Estoque', icon: 'inventory_2', href: '/inventory' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Configurações', icon: 'settings', href: '/settings' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`
        h-screen fixed left-0 top-0 z-50
        bg-surface-container border-r border-outline-variant
        flex flex-col items-center py-6
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo Section */}
      <div className={`mb-8 flex items-center justify-center w-full ${collapsed ? 'flex-col' : 'gap-3 px-4'}`}>
        <div
          className={`
            bg-primary-container text-on-primary-container rounded-full
            font-bold flex items-center justify-center shadow-sm shrink-0
            ${collapsed ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-base'}
          `}
        >
          PV
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-primary text-base leading-tight truncate">PipeVitta</h1>
            <p className="text-xs text-on-surface-variant truncate">Pessoas em primeiro lugar</p>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`
          flex items-center justify-center
          w-full py-2 mb-2
          text-on-surface-variant hover:bg-surface-container-high
          transition-colors cursor-pointer
        `}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        <span className="material-symbols-outlined text-xl">
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      {/* Main Navigation */}
      <div className="flex flex-col w-full gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center w-full border-l-4 transition-colors
                ${collapsed
                  ? 'flex-col justify-center py-3'
                  : 'gap-3 px-4 py-2.5 rounded-r-lg'
                }
                ${active
                  ? 'text-secondary border-secondary bg-secondary-container/10'
                  : 'text-on-surface-variant border-transparent hover:bg-surface-container-high'
                }
              `}
            >
              <span className={`material-symbols-outlined ${collapsed ? 'mb-1' : ''} ${active ? 'filled-icon' : ''}`}>
                {item.icon}
              </span>
              <span
                className={
                  collapsed
                    ? 'text-[10px] font-medium truncate w-full text-center px-1'
                    : 'text-sm font-medium truncate'
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="w-full mt-auto">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center w-full border-l-4 transition-colors
                ${collapsed
                  ? 'flex-col justify-center py-3'
                  : 'gap-3 px-4 py-2.5 rounded-r-lg'
                }
                ${active
                  ? 'text-secondary border-secondary bg-secondary-container/10'
                  : 'text-on-surface-variant border-transparent hover:bg-surface-container-high'
                }
              `}
            >
              <span className={`material-symbols-outlined ${collapsed ? 'mb-1' : ''} ${active ? 'filled-icon' : ''}`}>
                {item.icon}
              </span>
              <span
                className={
                  collapsed
                    ? 'text-[10px] font-medium truncate w-full text-center px-1'
                    : 'text-sm font-medium truncate'
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
