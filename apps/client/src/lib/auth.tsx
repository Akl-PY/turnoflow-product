import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  apiClient,
  AuthUser,
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearStoredAuth
} from './api';

export type { AuthUser };

export const authStorage = {
  getToken: getStoredToken,
  setToken: setStoredToken,
  getUser: getStoredUser,
  setUser: setStoredUser,
  logout: clearStoredAuth,
  isAuthenticated: () => Boolean(getStoredToken())
};

interface RegisterParams {
  email: string;
  password: string;
  fullName: string;
  businessName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = getStoredToken();
      const savedUser = getStoredUser();

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      setToken(savedToken);
      if (savedUser) {
        setUser(savedUser);
      }

      try {
        const res = await apiClient.get('/auth/me');
        const profile = res.data;
        if (profile && profile.email) {
          const verifiedUser: AuthUser = {
            id: profile.id || profile.userId || savedUser?.id || 'usr-1',
            email: profile.email,
            fullName: profile.fullName || savedUser?.fullName || 'Administrador',
            role: profile.role || 'ADMIN',
            organizationId: profile.organizationId,
            organizationName:
              profile.organizationName || savedUser?.organizationName || 'TurnoFlow Beauty Studio'
          };
          setUser(verifiedUser);
          setStoredUser(verifiedUser);
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          clearStoredAuth();
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', {
      email: email.trim(),
      password
    });
    const { accessToken, user: loggedUser } = res.data;
    setStoredToken(accessToken);
    setStoredUser(loggedUser);
    setToken(accessToken);
    setUser(loggedUser);
  };

  const register = async (params: RegisterParams) => {
    const res = await apiClient.post('/auth/register', {
      email: params.email.trim(),
      password: params.password,
      fullName: params.fullName.trim(),
      businessName: params.businessName.trim()
    });
    const { accessToken, user: createdUser } = res.data;
    setStoredToken(accessToken);
    setStoredUser(createdUser);
    setToken(accessToken);
    setUser(createdUser);
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return ctx;
}
