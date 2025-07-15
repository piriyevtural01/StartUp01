import React, { createContext, useContext, useState } from 'react';
import api from '../utils/api';

interface RegisterData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  register: (data: RegisterData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  verifyCode: (email: string, code: string) => Promise<void>;
  requestResend: (email: string) => Promise<void>;
  getCurrentUserEmail: () => string | null;
}

const AuthContext = createContext<AuthContextType>({
  register: async () => {},
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  verifyCode: async () => {},
  requestResend: async () => {},
  getCurrentUserEmail: () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register new user
  const register = async (data: RegisterData) => {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/register', data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Login and store token
  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data } = await api.post('/api/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setIsAuthenticated(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify registration code
  const verifyCode = async (email: string, code: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/verify-code', { email, code });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const requestResend = async (email: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/resend-code', { email });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get current user email from token
  const getCurrentUserEmail = (): string | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email || null;
    } catch {
      return null;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        register,
        login,
        logout,
        isAuthenticated,
        isLoading,
        authError: error,
        verifyCode,
        requestResend,
        getCurrentUserEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
