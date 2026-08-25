import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Modals
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  // Toasts
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => string;
  removeToast: (id: string) => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Retrieval visualization state
  retrievalActive: boolean;
  retrievalStage: string | null;
  retrievalProgress: number;
  setRetrievalActive: (active: boolean) => void;
  setRetrievalStage: (stage: string | null) => void;
  setRetrievalProgress: (progress: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      sidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Command Palette
      commandPaletteOpen: false,
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // Modals
      activeModal: null,
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      // Toasts
      toasts: [],
      addToast: (message, type) => {
        const id = Math.random().toString(36).slice(2);
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        return id;
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

      // Global Loading
      globalLoading: false,
      setGlobalLoading: (loading) => set({ globalLoading: loading }),

      // Retrieval
      retrievalActive: false,
      retrievalStage: null,
      retrievalProgress: 0,
      setRetrievalActive: (active) => set({ retrievalActive: active }),
      setRetrievalStage: (stage) => set({ retrievalStage: stage }),
      setRetrievalProgress: (progress) => set({ retrievalProgress: progress }),
    }),
    {
      name: 'rag-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

// Selectors for performance
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useCommandPaletteOpen = () => useUIStore((state) => state.commandPaletteOpen);
export const useTheme = () => useUIStore((state) => state.theme);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading);
export const useRetrievalState = () => useUIStore((state) => ({
  active: state.retrievalActive,
  stage: state.retrievalStage,
  progress: state.retrievalProgress,
}));