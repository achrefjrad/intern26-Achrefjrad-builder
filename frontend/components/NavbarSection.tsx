'use client'

import InlineTextEdit from "@/components/InlineTextEdit"
import { useTheme } from "@/components/theme"
import type { NavbarSectionData } from "@/components/types"

export default function NavbarSection({
  data,
  onBrandChange,
  onCtaChange,
}: {
  data: NavbarSectionData
  onBrandChange: (text: string) => void
  onCtaChange: (text: string) => void
}) {
  const theme = useTheme()
  return (
    <header
      className="px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-200/70"
      style={{ backgroundColor: "transparent" }}
    >
      <div className="text-xl font-bold text-slate-900">
        <InlineTextEdit
          value={data.brand_name}
          onChange={onBrandChange}
          emptyPlaceholder="Votre Marque"
          className="text-xl font-bold"
          ariaLabel="Brand name"
        />
      </div>
      <nav className="hidden md:flex items-center gap-6">
        {data.links.map((link, i) => (
          <a key={i} href={link.href} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            {link.label}
          </a>
        ))}
      </nav>
      <span
        className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{ backgroundColor: theme.primary_color }}
      >
        <InlineTextEdit
          value={data.cta_text}
          onChange={onCtaChange}
          emptyPlaceholder="Contact"
          className="text-sm font-semibold text-white"
          ariaLabel="Navbar CTA"
        />
      </span>
    </header>
  )
}
