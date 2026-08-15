'use client'

/* eslint-disable @next/next/no-img-element */

import { useRef } from "react"
import type { OverlaySectionData, Size } from "@/components/types"
import { getImageUrl } from "@/components/imageUrl"
import { LayoutStyleSelect } from "./LayoutStyleSelect"
import { TextField } from "./TextField"

export function OverlayEditor({
  data,
  onChange,
  onOpenImageModal,
}: {
  data: OverlaySectionData
  onChange: (patch: Partial<OverlaySectionData>) => void
  onOpenImageModal: () => void
}) {
  const overlayInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as OverlaySectionData["layout_style"] })}
        options={[
          { value: "full_bg_banner", label: "Full BG Banner" },
          { value: "split_cta", label: "Split CTA" },
        ]}
      />
      <div
        className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition mb-6"
        onClick={() => overlayInputRef.current?.click()}
      >
        <input
          ref={overlayInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onChange({ overlay_image_file: file, overlay_image_preview_url: URL.createObjectURL(file) })
          }}
          className="hidden"
        />
        {data.overlay_image_preview_url ? (
          <div className="relative group">
            <img src={getImageUrl(data.overlay_image_preview_url)} alt="Overlay preview" className="w-full h-40 object-cover rounded-lg" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Click to change</span>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">Click to upload background image</p>
            <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (recommended: 1920x800)</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenImageModal}
        className="mb-6 w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
      >
        Choose background image
      </button>

      <div className="space-y-4 mb-6">
        <TextField label="Title" value={data.overlay_title} onChange={(v) => onChange({ overlay_title: v })} placeholder="Enter overlay title..." />
        <TextField label="Subtitle" value={data.overlay_subtitle} onChange={(v) => onChange({ overlay_subtitle: v })} placeholder="Enter overlay subtitle..." multiline />
        <TextField label="CTA Text" value={data.cta_text} onChange={(v) => onChange({ cta_text: v })} placeholder="Contactez-nous" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Taille du texte</label>
          <select
            value={data.overlay_font_size}
            onChange={(e) => onChange({ overlay_font_size: e.target.value as Size })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Couleur du texte</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.overlay_text_color}
              onChange={(e) => onChange({ overlay_text_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-1"
            />
            <div className="flex gap-2">
              {["#ffffff", "#f8fafc", "#fde68a", "#fca5a5", "#7dd3fc", "#c084fc", "#34d399", "#000000"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ overlay_text_color: color })}
                  aria-label={`Set text color to ${color}`}
                  className={`w-7 h-7 rounded-full border transition ${
                    data.overlay_text_color.toLowerCase() === color
                      ? "ring-2 ring-indigo-500 ring-offset-2"
                      : "border-slate-200 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Police de caractère</label>
          <select
            value={data.overlay_font_family}
            onChange={(e) => onChange({ overlay_font_family: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="sans-serif">Sans-Serif (Modern)</option>
            <option value="serif">Serif (Classic)</option>
            <option value="monospace">Monospace (Code)</option>
            <option value="playfair">Playfair (Elegant)</option>
          </select>
        </div>
      </div>
    </div>
  )
}
