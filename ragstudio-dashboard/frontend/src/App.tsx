import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/themes/ThemeProvider';
import { Sidebar } from './components/navigation/Sidebar';
import { CommandPalette } from './components/navigation/CommandPalette';
import { SidebarToggle } from './components/navigation/Sidebar';
import { ToastContainer } from './components/animations/PageTransition';
import { useUIStore } from './stores/uiStore';
import { ThemeSelector } from './components/themes/ThemeSelector';
import { OllamaStatusBanner } from './components/OllamaStatus';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Retrieval = lazy(() => import('./pages/Retrieval').then(m => ({ default: m.Retrieval })));
const KnowledgeBases = lazy(() => import('./pages/KnowledgeBases').then(m => ({ default: m.KnowledgeBases })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Evaluations = lazy(() => import('./pages/Evaluations').then(m => ({ default: m.Evaluations })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Chunks = lazy(() => import('./pages/Chunks').then(m => ({ default: m.Chunks })));
const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage').then(m => ({ default: m.KnowledgeGraphPage })));
const Pipeline = lazy(() => import('./pages/Pipeline').then(m => ({ default: m.Pipeline })));
const Queries = lazy(() => import('./pages/Queries').then(m => ({ default: m.Queries })));
const QueryHistory = lazy(() => import('./pages/QueryHistory').then(m => ({ default: m.QueryHistory })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));
const ApiDocs = lazy(() => import('./pages/ApiDocs').then(m => ({ default: m.ApiDocs })));

// New ragstudio pages
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.default })));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100dvh-200px)] min-h-[200px]" aria-busy="true" aria-live="polite">
      <div className="text-center">
        <div className="skeleton h-8 w-48 mx-auto mb-4 rounded" />
        <div className="skeleton h-4 w-32 mx-auto rounded" />
      </div>
    </div>
  );
}

// Main Layout with Sidebar (existing pages)
function MainLayout() {
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen, commandPaletteOpen, closeCommandPalette } = useUIStore();
  const location = useLocation();

  return (
    <div className="h-[100dvh] min-h-[100dvh] flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Mobile sidebar toggle */}
      <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="main-content flex-1 flex flex-col min-w-0 min-h-0"
        style={{
          marginLeft: sidebarCollapsed ? '76px' : '246px',
          transition: 'margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Top Navigation Bar */}
        <header
          className="h-16 flex items-center justify-between px-6 border-b sticky top-0 z-30"
          style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <button
              onClick={() => useUIStore.getState().openCommandPalette()}
              className="btn-ghost p-2 relative"
              aria-label="Global search (Ctrl+K)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <kbd className="absolute -top-2 -right-2 hidden md:block px-1.5 py-0.5 text-[10px] rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-primary)' }}>
                ⌘K
              </kbd>
            </button>

            {/* Theme Selector */}
            <ThemeSelector />

            {/* User Menu */}
            <div className="relative">
              <button onClick={() => window.location.href = '/settings'} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none' }} aria-label="User menu">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <OllamaStatusBanner />
          <div className="p-6">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={closeCommandPalette}
        knowledgeBases={[]}
        documents={[]}
        recentQueries={[]}
        conversations={[]}
      />

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/retrieval': 'Retrieval',
    '/knowledge-bases': 'Knowledge Bases',
    '/documents': 'Documents',
    '/chunks': 'Chunks',
    '/knowledge-graph': 'Knowledge Graph',
    '/pipeline': 'RAG Pipeline',
    '/queries': 'Queries',
    '/query-history': 'Query History',
    '/chat': 'AI Assistant',
    '/evaluations': 'Evaluations',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
    '/support': 'Support',
    '/api-docs': 'API Docs',
  };

  for (const [path, title] of Object.entries(titles)) {
    if (pathname === path || (path !== '/' && pathname.startsWith(path + '/'))) {
      return title;
    }
  }
  return 'RAG AI Platform';
}

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // TODO: Add auth check
  const isAuthenticated = true; // Replace with actual auth check

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Studio Layout (ragstudio-dashboard style)
function StudioLayout() {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
      <ToastContainer />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Landing />} />

      {/* Protected Routes - Main App */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/retrieval" element={<Retrieval />} />
        <Route path="/knowledge-bases" element={<KnowledgeBases />} />
        <Route path="/knowledge-bases/:id" element={<KnowledgeBases />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/chunks" element={<Chunks />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/queries" element={<Queries />} />
        <Route path="/query-history" element={<QueryHistory />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:conversationId" element={<Chat />} />
        <Route path="/evaluations" element={<Evaluations />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/support" element={<Support />} />
        <Route path="/api-docs" element={<ApiDocs />} />
      </Route>

      {/* Legacy Studio redirect → Dashboard */}
      <Route path="/studio" element={<Navigate to="/dashboard" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;