// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, if a token is stored, validate it against the backend (rather
  // than trusting whatever was cached in localStorage) so a deactivated or
  // deleted account, or a changed role/permissions, is reflected immediately.
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await client.get('/api/admin/auth/me');
        setAdmin(res.data.data);
        localStorage.setItem('admin_info', JSON.stringify(res.data.data));
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_info');
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await client.post('/api/admin/auth/login', { email, password });
    const { token, admin: adminData } = res.data.data;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_info', JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    setAdmin(null);
  }, []);

  // Root accounts implicitly have every permission; non-root accounts need
  // the exact key set to true. Mirrors the backend's requirePermission
  // logic exactly, so the UI never shows something the API would reject.
  const hasPermission = useCallback(
    (key) => {
      if (!admin) return false;
      if (admin.role === 'root') return true;
      return admin.permissions?.[key] === true;
    },
    [admin]
  );

  const refreshMe = useCallback(async () => {
    const res = await client.get('/api/admin/auth/me');
    setAdmin(res.data.data);
    localStorage.setItem('admin_info', JSON.stringify(res.data.data));
    return res.data.data;
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, hasPermission, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
