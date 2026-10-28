import { create } from 'zustand';
import { changeLanguage } from '../i18n/index.js';
import { getPendingSyncCount } from '../db/offlineDb.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  language: localStorage.getItem('healthverse_language') || 'en',
  isOnline: navigator.onLine,
  pendingSyncCount: 0,

  setOnlineStatus: (status) => set({ isOnline: status }),
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

  updatePendingCount: async () => {
    try {
      const count = await getPendingSyncCount();
      set({ pendingSyncCount: count });
    } catch (e) {
      // IndexedDB might not be available
    }
  },

  setLanguage: async (lang) => {
    changeLanguage(lang);
    set({ language: lang });
    try {
      if (get().isAuthenticated) {
        await fetch('/api/v1/auth/language', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ language: lang })
        });
      }
    } catch (e) {
      // offline fallback
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch('/api/v1/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        set({
          user: data.user,
          profile: data.profile,
          isAuthenticated: true,
          language: data.user.language || 'en',
          isLoading: false
        });
        changeLanguage(data.user.language || 'en');
      } else {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err) {
      // Offline fallback: check cached user in localStorage
      const cached = localStorage.getItem('healthverse_cached_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          set({
            user: parsed.user,
            profile: parsed.profile,
            isAuthenticated: true,
            language: parsed.user.language || 'en',
            isLoading: false
          });
        } catch {
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
    get().updatePendingCount();
  },

  login: async (identifier, password) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    set({
      user: data.user,
      profile: data.profile,
      isAuthenticated: true,
      language: data.user.language || 'en'
    });

    localStorage.setItem('healthverse_cached_user', JSON.stringify({
      user: data.user,
      profile: data.profile
    }));
    localStorage.setItem('healthverse_device_id', `device-${data.user.id}`);

    changeLanguage(data.user.language || 'en');
    get().updatePendingCount();
    return data;
  },

  logout: async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    localStorage.removeItem('healthverse_cached_user');
    set({ user: null, profile: null, isAuthenticated: false });
  }
}));

export default useAuthStore;
