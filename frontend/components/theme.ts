'use client'

import { createContext, useContext } from "react"

export type ThemeState = {
  primary_color: string
  secondary_color: string
  background_color: string
  font_family: "serif" | "sans-serif" | "monospace"
  border_radius: "none" | "sm" | "lg" | "full"
}

export const defaultThemeState = (): ThemeState => ({
  primary_color: "#4f46e5",
  secondary_color: "#06b6d4",
  background_color: "#ffffff",
  font_family: "sans-serif",
  border_radius: "lg",
})

export const ThemeContext = createContext<ThemeState>(defaultThemeState())

export const useTheme = () => useContext(ThemeContext)

export const themeFontFamilies: Record<string, string> = {
  "sans-serif": "'Inter', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  monospace: "'Fira Code', Consolas, monospace",
}

export const themeRadiusClass: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-3xl",
}
