import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || localStorage.getItem('appcse_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await client.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (password) => {
    const res = await client.post('/auth/login', { password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('appcse_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('appcse_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, fetchCurrentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
