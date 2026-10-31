import { create } from 'zustand';
import { changeLanguage } from '../i18n/index.js';
import { getPendingSyncCount } from '../db/offlineDb.js';

// Synchronous optimistic session hydration from localStorage
const getCachedSession = () => {
  try {
    const raw = localStorage.getItem('healthverse_cached_user');
    const token = localStorage.getItem('healthverse_token');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.user && parsed.profile) {
        return {
          user: parsed.user,
          profile: parsed.profile,
          token: token || null,
          isAuthenticated: true,
          isLoading: false,
          language: parsed.user.language || localStorage.getItem('healthverse_language') || 'en'
        };
      }
    }
  } catch (e) {
    // Ignore corrupt cache
  }
  return {
    user: null,
    profile: null,
    token: localStorage.getItem('healthverse_token') || null,
    isAuthenticated: false,
    isLoading: !!localStorage.getItem('healthverse_token'),
    language: localStorage.getItem('healthverse_language') || 'en'
  };
};

const initialSession = getCachedSession();

export const useAuthStore = create((set, get) => ({
  user: initialSession.user,
  profile: initialSession.profile,
  token: initialSession.token,
  isAuthenticated: initialSession.isAuthenticated,
  isLoading: initialSession.isLoading,
  language: initialSession.language,
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
      // Offline fallback
    }
  },

  checkAuth: async () => {
    const token = get().token || localStorage.getItem('healthverse_token');
    if (!token && !get().user) {
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      get().updatePendingCount();
      return;
    }

    try {
      const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
      
      // 3.5s timeout prevents hanging on cold-starts or network drops
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('/api/v1/auth/me', {
        credentials: 'include',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const activeToken = data.token || token;
        if (data.token) localStorage.setItem('healthverse_token', data.token);
        localStorage.setItem('healthverse_cached_user', JSON.stringify({ user: data.user, profile: data.profile }));
        set({
          user: data.user,
          profile: data.profile,
          token: activeToken,
          isAuthenticated: true,
          language: data.user.language || 'en',
          isLoading: false
        });
        changeLanguage(data.user.language || 'en');
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('healthverse_token');
        localStorage.removeItem('healthverse_cached_user');
        set({ user: null, profile: null, token: null, isAuthenticated: false, isLoading: false });
      } else {
        // Non-auth server error: keep cached session if present
        set({ isLoading: false });
      }
    } catch (err) {
      // Offline / timeout: retain cached session seamlessly
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

    if (data.token) {
      localStorage.setItem('healthverse_token', data.token);
    }
    if (data.user && data.profile) {
      localStorage.setItem('healthverse_cached_user', JSON.stringify({
        user: data.user,
        profile: data.profile
      }));
    }
    localStorage.setItem('healthverse_device_id', `device-${data.user.id}`);

    set({
      user: data.user,
      profile: data.profile,
      token: data.token || null,
      isAuthenticated: true,
      isLoading: false,
      language: data.user.language || 'en'
    });

    changeLanguage(data.user.language || 'en');
    get().updatePendingCount();
    return data;
  },

  logout: async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    localStorage.removeItem('healthverse_cached_user');
    localStorage.removeItem('healthverse_token');
    set({ user: null, profile: null, token: null, isAuthenticated: false, isLoading: false });
  }
}));

export default useAuthStore;
