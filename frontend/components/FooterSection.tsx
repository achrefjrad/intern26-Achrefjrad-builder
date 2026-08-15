'use client'

import InlineTextEdit from "@/components/InlineTextEdit"
import { useTheme } from "@/components/theme"
import type { FooterSectionData } from "@/components/types"

export default function FooterSection({
  data,
  onBrandChange,
  onDescriptionChange,
  onCopyrightChange,
}: {
  data: FooterSectionData
  onBrandChange: (text: string) => void
  onDescriptionChange: (text: string) => void
  onCopyrightChange: (text: string) => void
}) {
  const theme = useTheme()
  return (
    <footer className="px-6 py-10 border-t border-slate-200/70">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-slate-900">
              <InlineTextEdit
                value={data.brand_name}
                onChange={onBrandChange}
                emptyPlaceholder="Votre Marque"
                className="text-xl font-bold"
                ariaLabel="Footer brand name"
              />
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">
              <InlineTextEdit
                value={data.description}
                onChange={onDescriptionChange}
                emptyPlaceholder="Description du site..."
                className="text-sm text-slate-500"
                ariaLabel="Footer description"
              />
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {data.links.map((link, i) => (
              <a key={i} href={link.href} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200/70 pt-6">
          <div className="flex items-center gap-3">
            {data.social_links.map((social, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: theme.primary_color }}
                title={social}
              >
                {social.charAt(0)}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            <InlineTextEdit
              value={data.copyright}
              onChange={onCopyrightChange}
              emptyPlaceholder="© 2026 Tous droits réservés."
              className="text-xs text-slate-400"
              ariaLabel="Copyright"
            />
          </p>
        </div>
      </div>
    </footer>
  )
}
