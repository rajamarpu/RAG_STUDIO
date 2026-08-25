import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Building2 } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const themes = [
  { id: 'light' as const, label: 'Light', icon: Sun, description: 'Clean & bright' },
  { id: 'dark' as const, label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
];

export function ThemeSelector() {
  const { theme, setTheme, isTransitioning } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const currentTheme = themes.find(t => t.id === theme) || themes[0];

  return (
    <div className="theme-selector" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="theme-selector-button"
        aria-label={`Current theme: ${currentTheme.label}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={isTransitioning}
      >
        <currentTheme.icon className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">{currentTheme.label}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="theme-selector-dropdown"
            role="listbox"
            aria-label="Select theme"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`theme-selector-option w-full text-left ${theme === t.id ? 'active' : ''}`}
                role="option"
                aria-selected={theme === t.id}
                disabled={isTransitioning}
              >
                <t.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs opacity-70">{t.description}</div>
                </div>
                {theme === t.id && (
                  <svg className="w-4 h-4 flex-shrink-0 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}