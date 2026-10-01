// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, permission, requireRoot = false }) {
  const { admin, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
        <Loader2 className="w-6 h-6 animate-spin" /> Loading...
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  if (requireRoot && admin.role !== 'root') {
    return <ForbiddenMessage />;
  }

  if (permission && !hasPermission(permission)) {
    return <ForbiddenMessage />;
  }

  return children;
}

function ForbiddenMessage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 px-4">
      <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-700" />
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Your account doesn't have permission to view this page. Contact a root administrator if you
        think this is a mistake.
      </p>
    </div>
  );
}
