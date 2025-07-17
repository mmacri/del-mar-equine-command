import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, User, initializeDatabase } from '@/lib/database';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await initializeDatabase();
      
      // Check for stored session
      const storedUser = localStorage.getItem('equine_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          // Verify user still exists in database
          const dbUser = await db.users.get(userData.id);
          if (dbUser) {
            setUser(dbUser);
          } else {
            localStorage.removeItem('equine_user');
          }
        } catch (error) {
          localStorage.removeItem('equine_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Simple authentication - in production, use proper password hashing
      const user = await db.users
        .where('username')
        .equals(username)
        .first();

      if (user && user.password_hash === password) {
        setUser(user);
        localStorage.setItem('equine_user', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('equine_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}