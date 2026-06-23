'use client';

import React from 'react';

export interface BatchAction {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface BatchActionMenuProps {
  selectedCount: number;
  actions: BatchAction[];
  onClear: () => void;
}

export const BatchActionMenu: React.FC<BatchActionMenuProps> = ({
  selectedCount,
  actions,
  onClear,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-6 text-sm animate-slide-in select-none border border-outline-variant/10">
      <div className="flex items-center gap-2 border-r border-outline-variant/30 pr-6">
        <span className="font-bold text-primary-fixed-dim">{selectedCount}</span>
        <span className="font-medium text-surface-container-highest">selecionado(s)</span>
        <button
          onClick={onClear}
          className="ml-2 text-xs font-semibold text-primary-fixed-dim hover:underline cursor-pointer"
          type="button"
        >
          Limpar
        </button>
      </div>

      <div className="flex items-center gap-3">
        {actions.map((act, index) => {
          let btnClass = "flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ";
          if (act.variant === 'danger') {
            btnClass += "bg-error/20 text-error hover:bg-error/30";
          } else if (act.variant === 'primary') {
            btnClass += "bg-primary text-on-primary hover:bg-surface-tint";
          } else {
            btnClass += "bg-inverse-on-surface/10 text-inverse-on-surface hover:bg-inverse-on-surface/20";
          }

          return (
            <button key={index} onClick={act.onClick} className={btnClass} type="button">
              <span className="material-symbols-outlined text-sm">{act.icon}</span>
              {act.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
