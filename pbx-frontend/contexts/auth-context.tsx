// contexts/auth-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

// Định nghĩa kiểu dữ liệu extension
interface Extension {
  _id: string;
  extension: string;
  name: string;
}

interface AuthContextType {
  extension: Extension | null;
  isLoading: boolean;
  login: (extensionId: string, secret: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  extension: null,
  isLoading: true,
  login: () => Promise.resolve(),
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [extension, setExtension] = useState<Extension | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra xem đã có extension trong localStorage chưa
    const storedExtension = localStorage.getItem("extension");

    if (storedExtension) {
      try {
        setExtension(JSON.parse(storedExtension));
      } catch (error) {
        console.error("Failed to parse stored extension:", error);
        localStorage.removeItem("extension");
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (extensionId: string, secret: string) => {
    try {
      // Gọi API xác thực extension
      const response = await axios.post("/api/auth/verify-extension", {
        extension: extensionId,
        secret,
      });

      const data = response.data;

      if (data.valid) {
        // Lưu thông tin extension
        setExtension(data.extension);
        localStorage.setItem("extension", JSON.stringify(data.extension));
        localStorage.setItem("extension-id", extensionId);
        localStorage.setItem("extension-secret", secret);
        router.push("/dashboard");
      } else {
        throw new Error("Thông tin extension không hợp lệ");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("extension");
    localStorage.removeItem("extension-id");
    localStorage.removeItem("extension-secret");
    setExtension(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        extension,
        isLoading,
        login,
        logout,
        isAuthenticated: !!extension,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
