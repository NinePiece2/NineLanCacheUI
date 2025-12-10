"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useMemo } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "dark" | "light";
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  actualTheme: "light",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getInitialTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") return defaultTheme;

  const cookies = document.cookie.split("; ");
  const themeCookie = cookies.find((row) => row.startsWith(`${storageKey}=`));
  const savedTheme = themeCookie?.split("=")[1] as Theme | undefined;

  if (savedTheme && ["dark", "light", "system"].includes(savedTheme)) {
    return savedTheme;
  }

  return defaultTheme;
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ninelancache-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(storageKey, defaultTheme));
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(getSystemTheme);

  const actualTheme = useMemo(() => {
    return theme === "system" ? systemTheme : (theme as "dark" | "light");
  }, [theme, systemTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(actualTheme);

    // Save to cookie
    document.cookie = `${storageKey}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [actualTheme, theme, storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const value = {
    theme,
    setTheme,
    actualTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
