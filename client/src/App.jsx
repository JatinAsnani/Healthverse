import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/useAuthStore.js';
import { initAutoSync } from './services/syncEngine.js';

// Components & Pages
import Navbar from './components/Navbar.jsx';
import SafetyBanner from './components/SafetyBanner.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PatientHome from './pages/PatientHome.jsx';
import SymptomReportPage from './pages/SymptomReportPage.jsx';
import ClinicianDashboard from './pages/ClinicianDashboard.jsx';
import PatientDetailView from './pages/PatientDetailView.jsx';
import CHWView from './pages/CHWView.jsx';
import HospitalAdminView from './pages/HospitalAdminView.jsx';
import PmjayScreeningPage from './pages/PmjayScreeningPage.jsx';
import ConsentManagementPage from './pages/ConsentManagementPage.jsx';
import EducationLibrary from './pages/EducationLibrary.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('UI Error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="card-premium p-8 max-w-md w-full bg-white space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-black">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-900">Application Notice</h2>
            <p className="text-xs text-slate-600">
              {this.state.error?.message || 'A temporary display issue occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/login';
              }}
              className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold w-full py-2.5"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function HomeMultiplexer() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  if (['doctor', 'nurse'].includes(user.role)) {
    return <ClinicianDashboard />;
  }
  if (user.role === 'chw') {
    return <CHWView />;
  }
  if (user.role === 'hospital_admin') {
    return <HospitalAdminView />;
  }
  return <PatientHome />;
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-500 font-semibold text-sm">
        Verifying session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
    initAutoSync();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <SafetyBanner />
          <Navbar />

          <main className="flex-1 pb-16">
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomeMultiplexer />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/symptoms/report"
                element={
                  <ProtectedRoute>
                    <SymptomReportPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/clinician"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'nurse', 'hospital_admin']}>
                    <ClinicianDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/clinician/patients/:id"
                element={
                  <ProtectedRoute>
                    <PatientDetailView />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pmjay"
                element={
                  <ProtectedRoute>
                    <PmjayScreeningPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/consent"
                element={
                  <ProtectedRoute>
                    <ConsentManagementPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/education" element={<EducationLibrary />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['hospital_admin']}>
                    <HospitalAdminView />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
