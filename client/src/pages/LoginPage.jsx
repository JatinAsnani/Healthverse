import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Stethoscope,
  UserCog,
  HeartHandshake,
  UserPlus,
  User
} from 'lucide-react';
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
  const [selectedDemoRole, setSelectedDemoRole] = useState('doc');

  const demoRoles = [
    { id: 'doc', label: 'Doctor', name: 'Dr. Ananya Sharma', desc: 'Internal Medicine', phone: '9800000002', icon: Stethoscope },
    { id: 'nurse', label: 'Nurse', name: 'Sister Priya', desc: 'Surgical Ward', phone: '9800000004', icon: UserCheck },
    { id: 'chw', label: 'ASHA / CHW', name: 'Sunita Devi', desc: 'Community Health', phone: '9800000006', icon: HeartHandshake },
    { id: 'patient', label: 'Patient', name: 'Devendra Patel', desc: 'Post-Surgery (HV-P105)', phone: '9800000015', icon: User },
    { id: 'admin', label: 'Admin', name: 'Hospital Admin', desc: 'Operations & Bed Flow', phone: '9800000001', icon: UserCog }
  ];

  const selectedDemo = demoRoles.find((d) => d.id === selectedDemoRole) || demoRoles[0];

  // Registration state
  const [regData, setRegData] = useState({
    name: '',
    phone: '',
    role: 'patient',
    password: '',
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-6 px-4 sm:px-6 transition-colors duration-200">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-10 h-10 rounded-xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white shadow-xs mx-auto">
          <HeartPulse className="w-5 h-5" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('appName')}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t('appTagline')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="card-clean p-5 sm:p-7 space-y-4">
          {/* Segmented Tab Switcher */}
          <div className="pill-track">
            <button
              onClick={() => setActiveTab('login')}
              className={`pill-item flex-1 py-1.5 text-center ${
                activeTab === 'login' ? 'pill-item-active' : ''
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`pill-item flex-1 py-1.5 text-center ${
                activeTab === 'register' ? 'pill-item-active' : ''
              }`}
            >
              New Registration
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <div className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block label-micro mb-1">
                    Phone Number or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="e.g. 9800000002"
                  />
                </div>

                <div>
                  <label className="block label-micro mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Enter password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-touch min-h-[40px] bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 mt-1"
                >
                  {isLoading ? 'Verifying...' : 'Sign In'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Sleek Segmented Quick Demo Accounts */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="label-micro">Quick Demo Roles</span>
                  <span className="text-[10px] text-slate-400 font-mono">pwd: password123</span>
                </div>

                <div className="pill-track overflow-x-auto scrollbar-none">
                  {demoRoles.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setSelectedDemoRole(d.id);
                        setIdentifier(d.phone);
                        setPassword('password123');
                      }}
                      className={`pill-item whitespace-nowrap ${
                        selectedDemoRole === d.id ? 'pill-item-active' : ''
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {selectedDemo && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="icon-box bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                        <selectedDemo.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {selectedDemo.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {selectedDemo.desc} &bull; <span className="font-mono">{selectedDemo.phone}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin(selectedDemo.phone)}
                      className="btn-touch min-h-[32px] px-3.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs flex-shrink-0"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block label-micro mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block label-micro mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-tabular"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block label-micro mb-1">
                    Role
                  </label>
                  <select
                    value={regData.role}
                    onChange={(e) => setRegData({ ...regData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  >
                    <option value="patient">Patient</option>
                    <option value="caregiver">Caregiver</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block label-micro mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={regData.dob}
                    onChange={(e) => setRegData({ ...regData, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-tabular"
                  />
                </div>
                <div>
                  <label className="block label-micro mb-1">
                    Gender
                  </label>
                  <select
                    value={regData.gender}
                    onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block label-micro mb-1">
                  Residential Village / Address
                </label>
                <input
                  type="text"
                  value={regData.address}
                  onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  placeholder="Village / Ward name"
                />
              </div>

              <div>
                <label className="block label-micro mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  placeholder="Create password (min 6 characters)"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-touch min-h-[40px] bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 mt-2"
              >
                {isLoading ? 'Creating Account...' : 'Complete Registration'}
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
