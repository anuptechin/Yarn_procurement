import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('ypp_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('ypp_token');
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

// Role helpers
export const ROLE_LABELS = {
  requisitioner: 'Requisitioner',
  procurement: 'Procurement',
  depthead: 'Dept Head',
  admin: 'Administrator',
};
export const can = {
  raise: (r) => ['requisitioner', 'procurement', 'admin'].includes(r),
  approve: (r) => ['depthead', 'admin'].includes(r),
  procure: (r) => ['procurement', 'admin'].includes(r),
  award: (r) => ['depthead', 'admin'].includes(r),
};
