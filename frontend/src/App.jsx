import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const OfficeDashboard = lazy(() => import('./pages/OfficeDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminOffices = lazy(() => import('./pages/AdminOffices'));
const AdminSubmission = lazy(() => import('./pages/AdminSubmission'));
const ConsolidatedView = lazy(() => import('./pages/ConsolidatedView'));


const LoadingFallback = () => (
  <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
    <div className="text-center">
      <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      <p className="mt-3 text-muted fw-medium">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!adminOnly && user.is_admin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <OfficeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/offices"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminOffices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/submission/:id"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminSubmission />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/consolidated"
        element={
          <ProtectedRoute adminOnly={true}>
            <ConsolidatedView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
};

export default App;
