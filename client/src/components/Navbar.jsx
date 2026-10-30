import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Wifi,
  WifiOff,
  RefreshCw,
  Languages,
  LogOut,
  User,
  Shield,
  ShieldAlert,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Home,
  Pill,
  Activity,
  FileText,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  Database
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import useThemeStore from '../store/useThemeStore.js';
import { triggerSync, subscribeSyncStatus } from '../services/syncEngine.js';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    profile,
    isAuthenticated,
    logout,
    language,
    setLanguage,
    isOnline,
    pendingSyncCount,
    updatePendingCount
  } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSyncPopoverOpen, setIsSyncPopoverOpen] = useState(false);
  const [isLangPopoverOpen, setIsLangPopoverOpen] = useState(false);

  const langRef = useRef(null);
  const syncRef = useRef(null);

  useEffect(() => {
    updatePendingCount();
    const unsubscribe = subscribeSyncStatus((status) => {
      if (status.isSyncing !== undefined) setIsSyncing(status.isSyncing);
      if (status.pendingCount !== undefined) updatePendingCount();
    });

    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setIsLangPopoverOpen(false);
      }
      if (syncRef.current && !syncRef.current.contains(e.target)) {
        setIsSyncPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await triggerSync();
    await updatePendingCount();
    setIsSyncing(false);
    setIsSyncPopoverOpen(false);
  };

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    setIsLangPopoverOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'guest';

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' }
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <>
      <nav className="bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-40 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
                    HealthVerse
                  </span>
                  <span className="hidden sm:block text-[9px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 -mt-0.5">
                    Continuity of Care
                  </span>
                </div>
              </Link>

              {/* Role Badge */}
              {isAuthenticated && (
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                  {t(`roles.${role}`, role)}
                </span>
              )}
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-2">
              {/* Online / Offline & Sync Drawer Button */}
              <div className="relative" ref={syncRef}>
                <button
                  onClick={() => setIsSyncPopoverOpen(!isSyncPopoverOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300"
                  aria-label="Toggle sync status details"
                >
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                  <span>{isOnline ? t('online') : t('offline')}</span>

                  {pendingSyncCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white font-tabular">
                      {pendingSyncCount}
                    </span>
                  )}
                </button>

                {/* Sync Details Popover */}
                {isSyncPopoverOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                        <Database className="w-4 h-4 text-teal-600" />
                        <span>Offline Sync Engine</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isOnline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {isOnline ? 'Connected' : 'Offline Mode'}
                      </span>
                    </div>

                    <div className="py-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between items-center">
                        <span>Pending Local Changes:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-tabular">
                          {pendingSyncCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>At-Rest Encryption:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> AES-256-GCM
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        {pendingSyncCount > 0
                          ? 'Changes are safely encrypted in your local browser storage and will upload to the hospital server automatically when reconnected.'
                          : 'All local changes are fully synchronised with the authoritative hospital server.'}
                      </p>
                    </div>

                    <button
                      onClick={handleSyncNow}
                      disabled={!isOnline || isSyncing}
                      className="w-full btn-touch min-h-[38px] py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Synchronising...' : 'Sync Now'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Language Switcher Chips Popover */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setIsLangPopoverOpen(!isLangPopoverOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  aria-label="Select application language"
                >
                  <Languages className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{currentLang.native}</span>
                </button>

                {isLangPopoverOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                      Choose Language
                    </div>
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => handleSelectLanguage(l.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          language === l.code
                            ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{l.native}</span>
                        <span className="text-[10px] text-slate-400">({l.label})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                className="p-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : (
                  <Sun className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Role Links & User Profile */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2 pl-1">
                  <Link
                    to="/education"
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      location.pathname === '/education'
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t('nav.education')}
                  </Link>

                  <div className="h-4 w-px bg-slate-200/70 dark:bg-slate-800/70" />

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold text-[11px] flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
                      {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px] leading-tight">
                        {profile?.name || user?.phone}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                        {user?.role}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title={t('nav.logout')}
                      aria-label="Log Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="btn-touch min-h-[36px] bg-teal-600 hover:bg-teal-700 text-white text-xs py-1.5 px-3.5 rounded-xl shadow-xs"
                >
                  Log In
                </Link>
              )}
            </div>

            {/* Mobile Header Controls */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                className="p-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300"
              >
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>

              {pendingSyncCount > 0 && (
                <button
                  onClick={handleSyncNow}
                  disabled={!isOnline || isSyncing}
                  className="p-1 px-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="font-tabular">{pendingSyncCount}</span>
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isOnline ? t('online') : t('offline')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleSelectLanguage(l.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      language === l.code
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {l.native}
                  </button>
                ))}
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
                  className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600"
                >
                  {t('nav.home')}
                </Link>
                <Link
                  to="/education"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600"
                >
                  {t('nav.education')}
                </Link>
                {user?.role === 'patient' && (
                  <Link
                    to="/consent"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600"
                  >
                    {t('nav.consent')}
                  </Link>
                )}
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
                Log In
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Persistent Mobile Bottom Navigation Bar (Elevates Mobile PWA Experience) */}
      {isAuthenticated && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/85 dark:bg-slate-900/85 border-t border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md px-3 py-1.5 flex items-center justify-around shadow-xs">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
              location.pathname === '/'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>

          {role === 'patient' && (
            <>
              <Link
                to="/symptoms/report"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
                  location.pathname === '/symptoms/report'
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Symptoms</span>
              </Link>

              <Link
                to="/education"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
                  location.pathname === '/education'
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Guides</span>
              </Link>

              <Link
                to="/consent"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
                  location.pathname === '/consent'
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Consent</span>
              </Link>
            </>
          )}

          {['doctor', 'nurse'].includes(role) && (
            <>
              <Link
                to="/clinician"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
                  location.pathname === '/clinician'
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Roster</span>
              </Link>

              <Link
                to="/education"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
                  location.pathname === '/education'
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Guides</span>
              </Link>
            </>
          )}

          {role === 'chw' && (
            <Link
              to="/education"
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
                location.pathname === '/education'
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Guides</span>
            </Link>
          )}
        </div>
      )}
    </>
  );
}

export default Navbar;
