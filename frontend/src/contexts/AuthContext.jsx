import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ratu_mis_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ratu_mis_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('ratu_mis_token', data.token);
    localStorage.setItem('ratu_mis_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await axios.post('/api/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('ratu_mis_token', data.token);
    localStorage.setItem('ratu_mis_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ratu_mis_token');
    localStorage.removeItem('ratu_mis_user');
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
