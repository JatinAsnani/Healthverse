import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartPulse, ShieldAlert, ArrowRight, UserCheck, Stethoscope, UserCog, HeartHandshake, UserPlus, User } from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('9800000002'); // Default to Doctor 1
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Registration state
  const [regData, setRegData] = useState({
    name: '',
    phone: '',
    role: 'patient',
    password: 'password123',
    gender: 'male',
    dob: '1985-06-15',
    address: 'Rural Cluster 3, Taluka Mandvi'
  });

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (phoneOrEmail, pwd = 'password123') => {
    setIdentifier(phoneOrEmail);
    setPassword(pwd);
    setError('');
    setIsLoading(true);

    try {
      await login(phoneOrEmail, pwd);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      // Auto login
      await login(regData.phone, regData.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-6 sm:py-10 px-3 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-600/30">
            <HeartPulse className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('appName')}
        </h2>
        <p className="mt-1 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          {t('appTagline')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-slate-900/95 py-6 px-4 sm:py-8 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/70 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 transition-colors">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-6 border border-transparent dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              New Registration (Patient / Caregiver)
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium text-slate-900 dark:text-slate-100 text-sm"
                    placeholder="e.g. 9800000002"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium text-slate-900 dark:text-slate-100 text-sm"
                    placeholder="Enter password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-touch bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/30 text-sm font-bold tracking-wide mt-2"
                >
                  {isLoading ? 'Verifying...' : 'Sign In to HealthVerse'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* 1-Click Quick Demo Accounts */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1-Click Demo Accounts (All Roles)
                  </span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-mono">
                    pass: password123
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickLogin('9800000002')}
                    className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/40 hover:bg-teal-100/60 dark:hover:bg-teal-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Doctor 1</span>
                    </div>
                    <div className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Dr. Ananya (Medicine)</div>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('9800000003')}
                    className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/40 hover:bg-teal-100/60 dark:hover:bg-teal-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Doctor 2</span>
                    </div>
                    <div className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Dr. Vikram (Surgery)</div>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('9800000004')}
                    className="p-2.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/40 hover:bg-sky-100/60 dark:hover:bg-sky-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300">
                      <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Nurse 1</span>
                    </div>
                    <div className="text-[10px] text-sky-700 dark:text-sky-400 font-medium">Sister Priya (Ward)</div>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('9800000006')}
                    className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/40 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                      <HeartHandshake className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>CHW / ASHA</span>
                    </div>
                    <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">Sunita Devi (Field)</div>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('9800000015')}
                    className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                      <span>Patient 5</span>
                    </div>
                    <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">Devendra (Critical Alert)</div>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('9800000011')}
                    className="p-2.5 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/40 hover:bg-orange-100/60 dark:hover:bg-orange-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800 dark:text-orange-300">
                      <User className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      <span>Patient 1</span>
                    </div>
                    <div className="text-[10px] text-orange-700 dark:text-orange-400 font-medium">Rajesh (High Alert)</div>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('9800000001')}
                    className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <UserCog className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Admin</span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Hospital Analytics</div>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('9800000020')}
                    className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/40 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <HeartHandshake className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Caregiver 1</span>
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Amit (Linked to P1)</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 text-sm"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 text-sm"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Account Role
                  </label>
                  <select
                    value={regData.role}
                    onChange={(e) => setRegData({ ...regData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="patient" className="dark:bg-slate-800">Patient</option>
                    <option value="caregiver" className="dark:bg-slate-800">Caregiver</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={regData.dob}
                    onChange={(e) => setRegData({ ...regData, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={regData.gender}
                    onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="male" className="dark:bg-slate-800">Male</option>
                    <option value="female" className="dark:bg-slate-800">Female</option>
                    <option value="other" className="dark:bg-slate-800">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Residential Village / Address
                </label>
                <input
                  type="text"
                  value={regData.address}
                  onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 text-sm"
                  placeholder="Village / Ward name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 text-sm"
                  placeholder="Create password (min 6 characters)"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Default: <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">password123</span> (or enter your custom password)
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-touch bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold tracking-wide mt-3"
              >
                {isLoading ? 'Creating Account...' : 'Complete Registration'}
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
