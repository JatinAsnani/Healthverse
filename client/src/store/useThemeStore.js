import { create } from 'zustand';

const THEME_STORAGE_KEY = 'healthverse_theme';

export const useThemeStore = create((set, get) => ({
  // Default to 'dark' as requested, or load user preference if previously chosen
  theme: localStorage.getItem(THEME_STORAGE_KEY) || 'dark',

  initTheme: () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: savedTheme });
  },

  setTheme: (newTheme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: newTheme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  }
}));

export default useThemeStore;
