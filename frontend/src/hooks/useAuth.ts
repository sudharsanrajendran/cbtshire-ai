import { useEffect, useState } from 'react';
import { getMe } from '../services/authService';
import type { User } from '../types';
export function useAuth() { const [user, setUser] = useState<User | null>(null); const [checking, setChecking] = useState(true); useEffect(() => { const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token'); if (!token) { setChecking(false); return; } void getMe().then(setUser).catch(() => { localStorage.removeItem('cbtshire_token'); localStorage.removeItem('northstar_token'); }).finally(() => setChecking(false)); }, []);  const logout = () => {
    localStorage.removeItem('cbtshire_token');
    localStorage.removeItem('northstar_token');
    setUser(null);
    window.location.href = '/login';
  };
  return { user, isAuthenticated: Boolean(user), checking, logout };
}
