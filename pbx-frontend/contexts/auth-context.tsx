// contexts/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Định nghĩa kiểu dữ liệu người dùng
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Tạo một user mặc định
const defaultUser: User = {
  id: '1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra xem đã có user trong localStorage chưa
    const storedUser = localStorage.getItem('user');
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        // Nếu có lỗi, đặt user mặc định
        setUser(defaultUser);
        localStorage.setItem('user', JSON.stringify(defaultUser));
      }
    } else {
      // Nếu chưa có, đặt user mặc định
      setUser(defaultUser);
      localStorage.setItem('user', JSON.stringify(defaultUser));
    }
    
    setIsLoading(false);
  }, []);

  const login = () => {
    // Luôn đăng nhập thành công với user mặc định
    setUser(defaultUser);
    localStorage.setItem('user', JSON.stringify(defaultUser));
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;