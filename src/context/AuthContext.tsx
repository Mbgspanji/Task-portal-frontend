import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../services/api';
import type { ApiResponse, User } from '../utils/types';

interface LoginResult {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getStoredSession = (): { token: string | null; user: User | null } => {
  const storedToken = localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('authUser');

  if (!storedToken || !storedUser) {
    return { token: null, user: null };
  }

  try {
    return { token: storedToken, user: JSON.parse(storedUser) as User };
  } catch {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session] = useState(getStoredSession);
  const [user, setUser] = useState<User | null>(session.user);
  const [token, setToken] = useState<string | null>(session.token);
  const isLoading = false;

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { token: newToken, user: newUser } =
      (response.data as ApiResponse<LoginResult>).data;

    if (!newToken || !newUser) {
      throw new Error('Login response did not contain a valid session.');
    }

    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
