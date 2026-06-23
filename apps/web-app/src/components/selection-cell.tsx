'use client';

import React from 'react';

interface SelectionCellProps {
  id: string;
  name: string;
  photoUrl?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const SelectionCell: React.FC<SelectionCellProps> = ({
  id: _id,
  name,
  photoUrl,
  checked,
  onChange,
}) => {
  // Get initials (up to 2 letters)
  const getInitials = (n: string) => {
    const parts = n.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="relative w-8 h-8 flex items-center justify-center group select-none">
      {/* Checkbox (visible when checked or on parent row hover / cell hover) */}
      {/* Note: we use classes to toggle visibility. To make it show on row hover, the parent <tr> should have group class. */}
      <div className={`
        ${checked ? 'flex' : 'hidden group-hover:flex'} 
        absolute inset-0 items-center justify-center bg-surface-container-lowest border border-outline-variant/30 rounded-full z-10 shadow-sm
      `}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-outline-variant text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
        />
      </div>

      {/* Avatar/Initials (hidden when checked or when row hovered if not checked) */}
      <div className={`
        ${checked ? 'hidden' : 'flex group-hover:hidden'} 
        w-8 h-8 rounded-full bg-primary-container text-on-primary-container items-center justify-center font-bold text-xs border border-primary/10 shadow-sm overflow-hidden
      `}>
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
    </div>
  );
};
