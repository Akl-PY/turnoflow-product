import { apiClient } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
}

const TOKEN_KEY = 'turnoflow_auth_token';
const USER_KEY = 'turnoflow_auth_user';

export const authStorage = {
  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  setToken(token: string) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  getUser(): AuthUser | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  setUser(user: AuthUser) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  logout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    delete apiClient.defaults.headers.common['Authorization'];
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }
};

// Inyectar token en cabeceras de axios si ya existía en localStorage
const existingToken = authStorage.getToken();
if (existingToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
}
