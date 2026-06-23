'use client';

import React from 'react';
import { TagsInput } from './tags-input';

export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'date' | 'text' | 'number' | 'tags';
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  filters: Record<string, string | number | boolean | string[] | null | undefined>;
  fields: FilterField[];
  onChange: (key: string, value: string | number | boolean | string[] | null | undefined) => void;
  onClearField: (key: string) => void;
  onClearAll: () => void;
  // Custom display mapping for chip values (e.g. { status: { NEW: 'Novo', WON: 'Ganho' } })
  valueLabelsMap?: Record<string, Record<string, string>>;
  tagSuggestions?: string[];
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  filters,
  fields,
  onChange,
  onClearField,
  onClearAll,
  valueLabelsMap = {},
  tagSuggestions = [],
}) => {
  // Check if there are active filters
  const activeFilters = Object.entries(filters).filter(([_key, val]) => {
    if (val === undefined || val === null || val === '') return false;
    if (val === 'ALL') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  });

  const hasActiveFilters = activeFilters.length > 0;

  const getChipLabel = (key: string, value: string | number | boolean | string[] | null | undefined) => {
    const field = fields.find((f) => f.key === key);
    const fieldLabel = field ? field.label : key;

    if (Array.isArray(value)) {
      return `${fieldLabel}: ${value.join(', ')}`;
    }

    // Check if there is a custom mapped label
    const mappedLabel = valueLabelsMap[key]?.[String(value)];
    if (mappedLabel) {
      return `${fieldLabel}: ${mappedLabel}`;
    }

    // Format date nicely
    if (field?.type === 'date') {
      try {
        return `${fieldLabel}: ${new Date(String(value) + 'T00:00:00').toLocaleDateString('pt-BR')}`;
      } catch {
        return `${fieldLabel}: ${value}`;
      }
    }

    return `${fieldLabel}: ${value}`;
  };

  return (
    <div className="space-y-4">
      {/* 1. Advanced Filters Form Panel */}
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface rounded-xl border border-outline-variant/30 animate-fade-in text-xs font-bold text-on-surface-variant select-none">
          {fields.map((field) => (
            <div key={field.key} className={`space-y-1 ${field.className || ''}`}>
              <label className="block text-xs font-semibold text-on-surface-variant">
                {field.label}
              </label>

              {field.type === 'select' && (
                <select
                  value={(filters[field.key] as string | number | undefined) ?? 'ALL'}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="w-full p-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-medium text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow cursor-pointer"
                >
                  <option value="ALL">Todos</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {(field.type === 'text' || field.type === 'number') && (
                <input
                  type={field.type}
                  value={(filters[field.key] as string | number | undefined) ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className="w-full p-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-medium text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                />
              )}

              {field.type === 'date' && (
                <input
                  type="date"
                  value={(filters[field.key] as string | number | undefined) ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {}
                  }}
                  className="w-full p-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-medium text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow cursor-pointer"
                />
              )}

              {field.type === 'tags' && (
                <TagsInput
                  tags={(filters[field.key] as string[]) ?? []}
                  onChange={(newTags) => onChange(field.key, newTags)}
                  placeholder={field.placeholder || 'Adicionar tag...'}
                  suggestions={tagSuggestions}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. Active Filter Chips Row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/30 select-none">
          {activeFilters.map(([key, val]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-3 py-0.5 bg-slate-50 hover:bg-slate-100/80 text-slate-600 border border-slate-200 rounded-full text-xs font-medium transition-colors"
            >
              <span>{getChipLabel(key, val)}</span>
              <button
                onClick={() => onClearField(key)}
                className="hover:bg-slate-200 rounded-full p-0.5 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 flex items-center justify-center"
                type="button"
              >
                <span className="material-symbols-outlined text-[12px] block">close</span>
              </button>
            </div>
          ))}

          <button
            onClick={onClearAll}
            className="text-xs font-bold text-primary hover:underline transition-colors cursor-pointer ml-2"
            type="button"
          >
            Limpar todos
          </button>
        </div>
      )}
    </div>
  );
};
