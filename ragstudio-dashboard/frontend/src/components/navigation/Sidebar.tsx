import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Database,
  FileText,
  Bot,
  BarChart2,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  Activity,
  Library,
  MessageSquare,
  CheckCircle,
  PieChart,
} from 'lucide-react';
import { useTheme } from '../themes/ThemeProvider';
import { useUIStore } from '../../stores/uiStore';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { path: '/retrieval', label: 'Retrieval', icon: Search, key: 'retrieval' },
  { path: '/knowledge-bases', label: 'Knowledge Bases', icon: Database, key: 'knowledge-bases' },
  { path: '/documents', label: 'Documents', icon: FileText, key: 'documents' },
  { path: '/chunks', label: 'Chunks', icon: Library, key: 'chunks' },
  { path: '/knowledge-graph', label: 'Knowledge Graph', icon: Activity, key: 'knowledge-graph' },
  { path: '/pipeline', label: 'RAG Pipeline', icon: PieChart, key: 'pipeline' },
  { path: '/queries', label: 'Queries', icon: BarChart2, key: 'queries' },
  { path: '/query-history', label: 'Query History', icon: Home, key: 'query-history' },
  { path: '/chat', label: 'AI Assistant', icon: Bot, key: 'chat' },
  { path: '/evaluations', label: 'Evaluations', icon: CheckCircle, key: 'evaluations' },
  { path: '/analytics', label: 'Analytics', icon: TrendingUp, key: 'analytics' },
  { path: '/settings', label: 'Settings', icon: Settings, key: 'settings' },
  { path: '/support', label: 'Support', icon: MessageSquare, key: 'support' },
  { path: '/api-docs', label: 'API Docs', icon: FileText, key: 'api-docs' },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  retrieval: Search,
  'knowledge-bases': Database,
  documents: FileText,
  chunks: Library,
  'knowledge-graph': Activity,
  pipeline: PieChart,
  queries: BarChart2,
  'query-history': Home,
  chat: Bot,
  evaluations: CheckCircle,
  analytics: TrendingUp,
  settings: Settings,
  support: MessageSquare,
  'api-docs': FileText,
};

export function Sidebar() {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useUIStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  useEffect(() => {
    const check = () => setIsMobileOverlay(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Update active indicator position
  useEffect(() => {
    if (indicatorRef.current) {
      const activeLink = sidebarRef.current?.querySelector('[data-active="true"]');
      if (activeLink) {
        const rect = activeLink.getBoundingClientRect();
        const sidebarRect = sidebarRef.current?.getBoundingClientRect();
        if (sidebarRect) {
          indicatorRef.current.style.transform = `translateY(${rect.top - sidebarRect.top}px)`;
          indicatorRef.current.style.height = `${rect.height}px`;
          indicatorRef.current.style.opacity = '1';
        }
      }
    }
  }, [location.pathname, collapsed]);

  const handleKeyDown = (event: React.KeyboardEvent, path: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(path);
    }
  };

  const getIcon = (key: string) => ICON_MAP[key] || LayoutDashboard;

  return (
    <>
      {/* Sidebar Background with Active Indicator */}
      <motion.aside
        ref={sidebarRef}
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        role="navigation"
        aria-label="Main navigation"
        initial={{ x: -246 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-primary)',
        }}
      >
        {/* Logo/Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: collapsed ? 0 : 1, x: 0 }}
            transition={{ duration: 0.2, delay: collapsed ? 0 : 0.1 }}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>RAG AI</span>
          </motion.div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto" role="list" aria-label="Navigation pages">
          <ul className="space-y-1" role="list">
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path + '/'));

              return (
                <li key={item.key} role="listitem">
                  <NavLink
                    to={item.path}
                    onKeyDown={(e) => handleKeyDown(e, item.path)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                    style={{
                      minHeight: '44px', // Touch target
                    }}
                    data-active={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    onMouseEnter={() => setHoveredItem(item.key)}
                    onMouseLeave={() => setHoveredItem(null)}
                    tabIndex={0}
                  >
                    <motion.div
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300 }}
                    >
                      <Icon
                        className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`}
                        style={{
                          color: isActive ? 'var(--accent-primary)' : 'inherit',
                        }}
                        aria-hidden="true"
                      />
                    </motion.div>

                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="font-medium truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Active indicator dot for collapsed state */}
                    {collapsed && isActive && (
                      <motion.div
                        className="absolute right-2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />
                      </motion.div>
                    )}

                    {/* Hover tooltip for collapsed state */}
                    {collapsed && (
                      <AnimatePresence>
                        {hoveredItem === item.key && (
                          <motion.div
                            key="tooltip"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-full ml-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg z-50"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-primary)',
                            }}
                          >
                            {item.label}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section - Theme Selector & User */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center justify-between">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Appearance
                </div>
                <ThemeSelectorInline />
              </motion.div>
            )}

            <div className="flex-shrink-0">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none' }}
                aria-label="User menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Active Indicator */}
        <motion.div
          ref={indicatorRef}
          className="active-indicator"
          style={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      </motion.aside>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {!collapsed && isMobileOverlay && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCollapsed(true)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Inline theme selector for sidebar
function ThemeSelectorInline() {
  const { theme, setTheme, isTransitioning } = useTheme();

  const themes = [
    { id: 'light' as const, label: 'Light', icon: '☀' },
    { id: 'dark' as const, label: 'Dark', icon: '🌙' },
  ];

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Select theme">
      {themes.map(t => (
        <button
          key={t.id}
          onClick={() => !isTransitioning && setTheme(t.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
            theme === t.id
              ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
          role="radio"
          aria-checked={theme === t.id}
          disabled={isTransitioning}
        >
          <span aria-hidden="true">{t.icon}</span>
          <span className="text-sm font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// Mobile sidebar toggle button
export function SidebarToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="lg:hidden p-2 rounded-lg transition-colors"
      style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none' }}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      )}
    </button>
  );
}