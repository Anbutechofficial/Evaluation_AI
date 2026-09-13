import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('edueval_token');
      const savedUser = localStorage.getItem('edueval_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with backend silently
          const res = await api.get('/auth/me');
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('edueval_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('Auth token validation expired or failed');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('edueval_token', access_token);
    localStorage.setItem('edueval_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (fullName, email, password, role = 'STAFF') => {
    const res = await api.post('/auth/register', {
      full_name: fullName,
      email,
      password,
      role
    });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('edueval_token', access_token);
    localStorage.setItem('edueval_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const syncClerkUser = async ({ email, full_name, clerk_id }) => {
    const res = await api.post('/auth/clerk-sync', {
      email,
      full_name: full_name || 'Staff Member',
      clerk_id,
      role: 'STAFF'
    });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('edueval_token', access_token);
    localStorage.setItem('edueval_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('edueval_token');
    localStorage.removeItem('edueval_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, syncClerkUser, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
