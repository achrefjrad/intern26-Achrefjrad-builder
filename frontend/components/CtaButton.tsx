'use client'

import { useTheme } from "@/components/theme"

export default function CtaButton({ text, primary = true }: { text: string; primary?: boolean }) {
  const theme = useTheme()
  return (
    <span
      className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold transition"
      style={{
        backgroundColor: primary ? theme.primary_color : "transparent",
        color: primary ? "#ffffff" : theme.primary_color,
        border: primary ? "none" : `1px solid ${theme.primary_color}`,
      }}
    >
      {text}
    </span>
  )
}
