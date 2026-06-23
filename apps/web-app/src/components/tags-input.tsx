'use client';

import React, { useState } from 'react';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  dark?: boolean;
  suggestions?: string[];
}

export const TagsInput: React.FC<TagsInputProps> = ({
  tags,
  onChange,
  placeholder = 'Adicionar tag...',
  dark = false,
  suggestions = [],
}) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.trim();
      if (val && !tags.map(t => t.toLowerCase()).includes(val.toLowerCase())) {
        onChange([...tags, val]);
      }
      setInput('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !tags.map((t) => t.toLowerCase()).includes(s.toLowerCase())
  );

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-wrap items-center gap-1.5 p-2 rounded-xl border min-h-[40px] focus-within:border-primary transition-all ${
        dark
          ? 'bg-neutral-800 border-neutral-700'
          : 'bg-surface-container-lowest border-outline-variant'
      }`}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
            dark
              ? 'bg-neutral-700 text-neutral-200'
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="hover:opacity-85 cursor-pointer flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[10px] block">close</span>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className={`flex-1 bg-transparent text-xs font-semibold focus:outline-none min-w-[60px] border-0 focus:ring-0 focus:border-0 focus:outline-none shadow-none p-0 ${
          dark
            ? 'text-neutral-200 placeholder:text-neutral-500'
            : 'text-on-surface placeholder:text-outline/50'
        }`}
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          className={`absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl z-50 p-1 ${
            dark
              ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
              : 'bg-surface-container-lowest border-outline-variant text-on-surface'
          }`}
        >
          {filteredSuggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange([...tags, s]);
                setInput('');
                setShowSuggestions(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                dark
                  ? 'hover:bg-neutral-700 text-neutral-200'
                  : 'hover:bg-slate-100 text-on-surface'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
