'use client'

/* eslint-disable @next/next/no-img-element */

import { useRef } from "react"
import type { HeroSectionData, HeroType, Size } from "@/components/types"
import { getImageUrl } from "@/components/imageUrl"
import { LayoutStyleSelect } from "./LayoutStyleSelect"
import { TextField } from "./TextField"

export function HeroEditor({
  data,
  onChange,
  onOpenImageModal,
}: {
  data: HeroSectionData
  onChange: (patch: Partial<HeroSectionData>) => void
  onOpenImageModal: () => void
}) {
  const heroInputRef = useRef<HTMLInputElement>(null)
  const previewUrls = data.hero_image_preview_urls.filter(Boolean)
  const previews = previewUrls.length > 0 ? previewUrls : data.hero_image_preview_url ? [data.hero_image_preview_url] : []

  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as HeroSectionData["layout_style"] })}
        options={[
          { value: "centered_bg", label: "Centered BG" },
          { value: "split_50_50", label: "Split 50/50" },
          { value: "minimal_text", label: "Minimal Text" },
        ]}
      />

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Banner Type</label>
        <div className="flex gap-2">
          {(["image", "text"] as HeroType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ hero_type: type })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                data.hero_type === type
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type === "image" ? "Image" : "Text"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <TextField label="CTA Text" value={data.cta_text} onChange={(v) => onChange({ cta_text: v })} placeholder="En savoir plus" />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Taille du texte</label>
          <select
            value={data.hero_font_size}
            onChange={(e) => onChange({ hero_font_size: e.target.value as Size })}
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
              value={data.hero_text_color}
              onChange={(e) => onChange({ hero_text_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-1"
            />
            <div className="flex gap-2">
              {["#ffffff", "#f8fafc", "#fde68a", "#fca5a5", "#7dd3fc", "#c084fc", "#34d399", "#000000"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ hero_text_color: color })}
                  aria-label={`Set text color to ${color}`}
                  className={`w-7 h-7 rounded-full border transition ${
                    data.hero_text_color.toLowerCase() === color
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
            value={data.hero_font_family}
            onChange={(e) => onChange({ hero_font_family: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="sans-serif">Sans-Serif (Modern)</option>
            <option value="serif">Serif (Classic)</option>
            <option value="monospace">Monospace (Code)</option>
            <option value="playfair">Playfair (Elegant)</option>
          </select>
        </div>
      </div>

      {data.hero_type === "image" ? (
        <div>
          <div
            className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition"
            onClick={() => heroInputRef.current?.click()}
          >
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onChange({ hero_image_file: file, hero_image_preview_url: URL.createObjectURL(file) })
              }}
              className="hidden"
            />
            {previews.length >= 2 ? (
              <div className="flex gap-2">
                {previews.map((url, i) => (
                  <div key={url} className="relative flex-1 min-w-0">
                    <img src={getImageUrl(url)} alt={`Hero slide ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    <span className="absolute bottom-1 right-1 text-[10px] font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">
                      {i + 1}/{previews.length}
                    </span>
                  </div>
                ))}
              </div>
            ) : previews.length === 1 ? (
              <div className="relative group">
                <img src={getImageUrl(previews[0])} alt="Hero preview" className="w-full h-40 object-cover rounded-lg" />
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
                <p className="text-sm font-medium text-slate-600">Click to upload hero image</p>
                <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (recommended: 1920x800)</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenImageModal}
            className="mt-3 w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            Choose up to 3 hero images
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <TextField label="Hero Title" value={data.hero_title} onChange={(v) => onChange({ hero_title: v })} placeholder="Enter hero title..." />
          <TextField label="Hero Subtitle" value={data.hero_subtitle} onChange={(v) => onChange({ hero_subtitle: v })} placeholder="Enter hero subtitle..." />
        </div>
      )}
    </div>
  )
}
