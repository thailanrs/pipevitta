'use client';

import React, { useState, useRef, useEffect } from 'react';

export type PeriodType = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM';

export interface PeriodDropdownValue {
  type: PeriodType;
  startDate?: string;
  endDate?: string;
}

interface PeriodSelectorProps {
  mode?: 'chevrons' | 'dropdown';
  
  // Chevron mode props
  label?: string;
  type?: 'date' | 'month';
  value?: string;
  onChange?: (val: string) => void;
  onAdjust?: (amount: number) => void;

  // Dropdown mode props
  dropdownValue?: PeriodDropdownValue;
  onDropdownChange?: (val: PeriodDropdownValue) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  mode = 'chevrons',
  label,
  type = 'date',
  value,
  onChange,
  onAdjust,
  dropdownValue,
  onDropdownChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(dropdownValue?.startDate || '');
  const [customEnd, setCustomEnd] = useState(dropdownValue?.endDate || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownOptions: { value: PeriodType; label: string; icon: string }[] = [
    { value: 'ALL', label: 'Máximo (Tudo)', icon: 'all_inclusive' },
    { value: 'TODAY', label: 'Hoje', icon: 'today' },
    { value: 'LAST_7_DAYS', label: 'Últimos 7 dias', icon: 'date_range' },
    { value: 'LAST_30_DAYS', label: 'Últimos 30 dias', icon: 'calendar_month' },
    { value: 'THIS_MONTH', label: 'Este mês', icon: 'calendar_today' },
    { value: 'CUSTOM', label: 'Intervalo Personalizado', icon: 'date_range' },
  ];

  const handleSelectOption = (t: PeriodType) => {
    if (!onDropdownChange) return;
    if (t !== 'CUSTOM') {
      onDropdownChange({ type: t });
      setIsOpen(false);
    } else {
      onDropdownChange({ type: t, startDate: customStart, endDate: customEnd });
    }
  };

  const handleApplyCustom = () => {
    if (!onDropdownChange) return;
    onDropdownChange({ type: 'CUSTOM', startDate: customStart, endDate: customEnd });
    setIsOpen(false);
  };

  const getActiveDropdownLabel = () => {
    if (!dropdownValue) return 'Período';
    if (dropdownValue.type === 'CUSTOM') {
      if (dropdownValue.startDate && dropdownValue.endDate) {
        const startStr = new Date(dropdownValue.startDate + 'T00:00:00').toLocaleDateString('pt-BR');
        const endStr = new Date(dropdownValue.endDate + 'T00:00:00').toLocaleDateString('pt-BR');
        return `${startStr} - ${endStr}`;
      }
      return 'Intervalo Personalizado';
    }
    const opt = dropdownOptions.find((o) => o.value === dropdownValue.type);
    return opt ? opt.label : 'Período';
  };

  // Chevron Navigation Mode
  if (mode === 'chevrons') {
    return (
      <div className="flex items-center bg-surface border border-outline-variant/30 rounded-lg p-1 shrink-0">
        <button
          onClick={() => onAdjust && onAdjust(-1)}
          className="p-1 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined block text-xl">chevron_left</span>
        </button>
        <div className="relative px-3 py-1.5 text-sm font-semibold text-on-surface select-none hover:bg-surface-container rounded transition-colors cursor-pointer flex items-center">
          <span>{label}</span>
          <input
            type={type}
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              if (val && onChange) onChange(val);
            }}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch (err) {
                console.error("showPicker not supported", err);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <button
          onClick={() => onAdjust && onAdjust(1)}
          className="p-1 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined block text-xl">chevron_right</span>
        </button>
      </div>
    );
  }

  // Dropdown Mode
  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/60 hover:border-primary text-sm font-semibold text-on-surface py-2 px-3.5 rounded-xl transition-all cursor-pointer shadow-sm"
        type="button"
      >
        <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
        <span>{getActiveDropdownLabel()}</span>
        <span className="material-symbols-outlined text-sm text-outline">arrow_drop_down</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xl z-50 p-3.5 space-y-2 animate-fade-in">
          <p className="text-[10px] font-bold text-outline uppercase tracking-wider px-2 mb-1">Escolha rápida</p>
          <div className="space-y-1">
            {dropdownOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelectOption(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                  dropdownValue?.type === opt.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low/50 hover:text-on-surface'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-base">{opt.icon}</span>
                <span className="flex-1">{opt.label}</span>
                {dropdownValue?.type === opt.value && (
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                )}
              </button>
            ))}
          </div>

          {dropdownValue?.type === 'CUSTOM' && (
            <div className="pt-3 border-t border-outline-variant/20 mt-2 space-y-3.5 px-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-outline uppercase">De</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg font-semibold text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-outline uppercase">Até</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg font-semibold text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow cursor-pointer"
                />
              </div>
              <button
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd}
                className="w-full py-2 bg-primary hover:bg-surface-tint text-on-primary text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                type="button"
              >
                Aplicar Intervalo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
