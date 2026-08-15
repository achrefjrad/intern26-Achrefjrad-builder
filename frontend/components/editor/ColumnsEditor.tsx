'use client'

/* eslint-disable @next/next/no-img-element */

import { useRef } from "react"
import type { ColumnsSectionData, ColumnItem, ContentType } from "@/components/types"
import { getImageUrl } from "@/components/imageUrl"
import { LayoutStyleSelect } from "./LayoutStyleSelect"
import { TextField } from "./TextField"

export function ColumnsEditor({
  data,
  onChange,
  onColumnChange,
  onOpenImageModal,
}: {
  data: ColumnsSectionData
  onChange: (patch: Partial<ColumnsSectionData>) => void
  onColumnChange: (position: number, updater: (col: ColumnItem) => ColumnItem) => void
  onOpenImageModal: (columnIndex: number) => void
}) {
  const columnInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as ColumnsSectionData["layout_style"] })}
        options={[
          { value: "grid_cards", label: "Grid Cards" },
          { value: "asymmetric_featured", label: "Asymmetric" },
          { value: "alternating_rows", label: "Alternating" },
        ]}
      />
      <div className="mb-6 space-y-4">
        <TextField label="Section Title" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Nos services" />
        <TextField label="Section Subtitle" value={data.subtitle} onChange={(v) => onChange({ subtitle: v })} placeholder="Découvrez ce que nous proposons" multiline />
      </div>

      {data.layout_style === "grid_cards" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Number of Columns</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ column_count: n })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  data.column_count === n
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.columns.slice(0, data.column_count).map((col, index) => (
          <div key={col.position} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-200 hover:shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Column {col.position}</h3>
              <span className="text-xs text-slate-400 font-mono">0{col.position}</span>
            </div>

            <div className="mb-3">
              <TextField label="Title" value={col.title} onChange={(v) => onColumnChange(col.position, (c) => ({ ...c, title: v }))} placeholder="Titre de la colonne" />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Content Type</label>
              <select
                value={col.content_type}
                onChange={(e) => onColumnChange(col.position, (c) => ({ ...c, content_type: e.target.value as ContentType }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              >
                <option value="both">Image &amp; Text</option>
                <option value="image_only">Image Only</option>
                <option value="text_only">Text Only</option>
                <option value="slider">Image Slider</option>
              </select>
            </div>

            {col.content_type === "slider" ? (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Slides ({col.images.length})</span>
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(index)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Choose slides
                  </button>
                </div>
                {col.images.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {col.images.map((img, i) => (
                      <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-slate-200">
                        <img src={getImageUrl(img)} alt={`Column ${col.position} slide ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => onColumnChange(col.position, (c) => ({ ...c, images: c.images.filter((_, j) => j !== i) }))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          aria-label={`Remove slide ${i + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400">No slides yet — use &quot;Choose slides&quot; to add up to 3 images.</p>
                  </div>
                )}
              </div>
            ) : col.content_type !== "text_only" && (
              <div
                className="relative border-2 border-dashed border-slate-200 rounded-lg mb-3 aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition overflow-hidden"
                onClick={() => columnInputRefs.current[col.position]?.click()}
              >
                <input
                  ref={(el) => { columnInputRefs.current[col.position] = el }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onColumnChange(col.position, (c) => ({ ...c, image_file: file, image_preview_url: URL.createObjectURL(file) }))
                  }}
                  className="hidden"
                />
                {col.image_preview_url ? (
                  <img src={getImageUrl(col.image_preview_url)} alt={`Column ${col.position}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-6 h-6 mx-auto text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-xs text-slate-400">Upload image</p>
                  </div>
                )}
              </div>
            )}

            {col.content_type !== "image_only" && col.content_type !== "slider" && (
              <textarea
                value={col.text}
                onChange={(e) => onColumnChange(col.position, (c) => ({ ...c, text: e.target.value }))}
                placeholder="Enter description..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition"
                rows={3}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
