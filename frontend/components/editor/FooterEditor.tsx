'use client'

import type { FooterSectionData } from "@/components/types"
import { TextField } from "./TextField"

export function FooterEditor({
  data,
  onChange,
}: {
  data: FooterSectionData
  onChange: (patch: Partial<FooterSectionData>) => void
}) {
  return (
    <div>
      <div className="space-y-4 mb-6">
        <TextField label="Brand Name" value={data.brand_name} onChange={(v) => onChange({ brand_name: v })} placeholder="Votre Marque" />
        <TextField label="Description" value={data.description} onChange={(v) => onChange({ description: v })} placeholder="Courte description du site..." multiline />
        <TextField label="Copyright" value={data.copyright} onChange={(v) => onChange({ copyright: v })} placeholder="© 2026 Tous droits réservés." />
      </div>
      <div className="space-y-4">
        {data.links.map((link, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Lien {i + 1}</h3>
              <button
                type="button"
                onClick={() => onChange({ links: data.links.filter((_, j) => j !== i) })}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Label" value={link.label} onChange={(v) => onChange({ links: data.links.map((it, j) => (j === i ? { ...it, label: v } : it)) })} placeholder="Accueil" />
              <TextField label="Href" value={link.href} onChange={(v) => onChange({ links: data.links.map((it, j) => (j === i ? { ...it, href: v } : it)) })} placeholder="#" />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ links: [...data.links, { label: "", href: "#" }] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Link
        </button>
      </div>
      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Réseaux sociaux</label>
        {data.social_links.map((social, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={social}
              onChange={(e) => onChange({ social_links: data.social_links.map((it, j) => (j === i ? e.target.value : it)) })}
              placeholder="Instagram"
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
            <button
              type="button"
              onClick={() => onChange({ social_links: data.social_links.filter((_, j) => j !== i) })}
              className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ social_links: [...data.social_links, ""] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Social Link
        </button>
      </div>
    </div>
  )
}
