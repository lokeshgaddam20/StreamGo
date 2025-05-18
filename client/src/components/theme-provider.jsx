"use client"

import { createContext, useContext, useEffect, useState } from "react"

const ThemeProviderContext = createContext({
  theme: "dark",
  setTheme: () => null,
})

export function ThemeProvider({ children, defaultTheme = "dark", storageKey = "streamgo-theme" }) {
  const [theme, setTheme] = useState(defaultTheme)

  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey)
    
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Check for system preference
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(systemPrefersDark ? "dark" : "light")
    }
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove all theme classes
    root.classList.remove("light", "dark")
    
    // Add the current theme class
    root.classList.add(theme)
    
    // Save to localStorage
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  const value = {
    theme,
    setTheme: (newTheme) => {
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  
  return context
}