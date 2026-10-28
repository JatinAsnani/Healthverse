import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Wifi,
  WifiOff,
  RefreshCw,
  Globe,
  LogOut,
  User,
  Shield,
  Bell,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import useThemeStore from '../store/useThemeStore.js';
import { triggerSync, subscribeSyncStatus } from '../services/syncEngine.js';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAuthenticated, logout, language, setLanguage, isOnline, pendingSyncCount, updatePendingCount } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    updatePendingCount();
    const unsubscribe = subscribeSyncStatus((status) => {
      if (status.isSyncing !== undefined) setIsSyncing(status.isSyncing);
      if (status.pendingCount !== undefined) updatePendingCount();
    });
    return unsubscribe;
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await triggerSync();
    await updatePendingCount();
    setIsSyncing(false);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'guest';

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 shadow-sm dark:shadow-slate-950/40 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  HealthVerse
                </span>
                <span className="hidden sm:block text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 -mt-1">
                  Continuity of Care
                </span>
              </div>
            </Link>

            {/* Role Badge */}
            {isAuthenticated && (
              <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {t(`roles.${role}`, role)}
              </span>
            )}
          </div>

          {/* Center/Right Nav Controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Online / Offline & Sync Indicator */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                <span>{isOnline ? t('online') : t('offline')}</span>
              </div>

              {/* Pending Sync Badge & Button */}
              {pendingSyncCount > 0 && (
                <button
                  onClick={handleSyncNow}
                  disabled={!isOnline || isSyncing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 transition-colors"
                  title="Offline records waiting to sync"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{pendingSyncCount} {t('pendingSync')}</span>
                </button>
              )}
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <select
                value={language}
                onChange={handleLanguageChange}
                className="bg-transparent font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                aria-label="Language Selector"
              >
                <option value="en" className="dark:bg-slate-800 dark:text-slate-200">English</option>
                <option value="hi" className="dark:bg-slate-800 dark:text-slate-200">हिंदी (Hindi)</option>
                <option value="gu" className="dark:bg-slate-800 dark:text-slate-200">ગુજરાતી (Gujarati)</option>
              </select>
            </div>

            {/* Theme Toggle Button (Light/Dark) */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              className="p-2 rounded-xl border transition-all duration-200 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border-slate-200 text-amber-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 transition-transform duration-300 rotate-0 hover:-rotate-12 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              ) : (
                <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              )}
            </button>

            {/* Role Links */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/education"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname === '/education'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('nav.education')}
                </Link>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                      {profile?.name || user?.phone}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{user?.role}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title={t('nav.logout')}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs py-2 px-4 shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              className="p-2 rounded-xl border bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-amber-500 dark:text-cyan-400"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {pendingSyncCount > 0 && (
              <button
                onClick={handleSyncNow}
                disabled={!isOnline || isSyncing}
                className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingSyncCount}</span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{isOnline ? t('online') : t('offline')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
              >
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
              </select>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 pb-1">
                Signed in as <strong className="text-slate-800 dark:text-slate-100">{profile?.name || user?.phone}</strong> ({user?.role})
              </div>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/education"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
              >
                {t('nav.education')}
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full py-2.5 text-center font-bold bg-teal-600 text-white rounded-xl shadow"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
