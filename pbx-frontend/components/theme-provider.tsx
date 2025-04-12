"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

// Định nghĩa kiểu Theme
type Theme = "dark" | "light" | "system";

// Props cho ThemeProvider
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

// State context của ThemeProvider
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Tạo context với giá trị mặc định
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme-preference",
  ...props
}: ThemeProviderProps) {
  // State để lưu theme hiện tại
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  
  // Effect để khôi phục theme từ localStorage khi component được mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme(defaultTheme);
    }
  }, [defaultTheme, storageKey]);
  
  // Effect để áp dụng theme vào document
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Xóa các class theme cũ
    root.classList.remove("light", "dark");
    
    // Áp dụng theme mới
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);
  
  // Hàm cập nhật theme
  const setThemeValue = React.useCallback((newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setTheme(newTheme);
  }, [storageKey]);
  
  // Value cho context
  const contextValue = React.useMemo(() => ({
    theme,
    setTheme: setThemeValue,
  }), [theme, setThemeValue]);
  
  return (
    <ThemeContext.Provider value={contextValue} {...props}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook để sử dụng theme trong các components
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
}

// Tạo component ThemeToggle để chuyển đổi theme
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  
  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-full bg-neutral-200 dark:bg-neutral-800"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

// Component ThemeSelect cho phép lựa chọn theme
export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  
  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      className="p-2 rounded border bg-transparent"
      aria-label="Select theme"
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}