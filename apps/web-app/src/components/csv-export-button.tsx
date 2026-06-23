'use client';

import React from 'react';

interface CSVExportButtonProps {
  headers: string[];
  rows: (string | number | null | undefined)[][];
  filename: string;
  className?: string;
}

export const CSVExportButton: React.FC<CSVExportButtonProps> = ({
  headers,
  rows,
  filename,
  className = "flex items-center gap-2 px-3 py-1.5 border border-outline rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
}) => {
  const handleExport = () => {
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  };

  return (
    <button onClick={handleExport} className={className} type="button">
      <span className="material-symbols-outlined text-sm">download</span>
      Exportar CSV
    </button>
  );
};
