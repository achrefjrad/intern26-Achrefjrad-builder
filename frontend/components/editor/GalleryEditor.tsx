'use client'

/* eslint-disable @next/next/no-img-element */

import { useRef } from "react"
import type { GallerySectionData } from "@/components/types"
import { getImageUrl } from "@/components/imageUrl"
import { LayoutStyleSelect } from "./LayoutStyleSelect"
import { TextField } from "./TextField"

export function GalleryEditor({
  data,
  onChange,
  onOpenImageModal,
}: {
  data: GallerySectionData
  onChange: (patch: Partial<GallerySectionData>) => void
  onOpenImageModal: (itemIndex: number) => void
}) {
  const itemInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as GallerySectionData["layout_style"] })}
        options={[
          { value: "masonry_grid", label: "Masonry Grid" },
          { value: "row_grid", label: "Row Grid" },
        ]}
      />
      <div className="mb-6 space-y-4">
        <TextField label="Section Title" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Galerie" />
        <TextField label="Section Subtitle" value={data.subtitle} onChange={(v) => onChange({ subtitle: v })} placeholder="Quelques images de nos réalisations" multiline />
      </div>

      <div className="space-y-3">
        {data.items.map((item, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Photo {i + 1}</h3>
              <button
                type="button"
                onClick={() => onChange({ items: data.items.filter((_, j) => j !== i) })}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Remove
              </button>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="relative w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition flex-shrink-0"
                onClick={() => itemInputRefs.current[i]?.click()}
              >
                <input
                  ref={(el) => { itemInputRefs.current[i] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const items = data.items.map((it, j) =>
                        j === i ? { ...it, image_file: file, image_preview_url: URL.createObjectURL(file) } : it
                      )
                      onChange({ items })
                    }
                  }}
                />
                {item.image_preview_url ? (
                  <img src={getImageUrl(item.image_preview_url)} alt={`Gallery ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const items = data.items.map((it, j) => (j === i ? { ...it, title: e.target.value } : it))
                    onChange({ items })
                  }}
                  placeholder="Photo title..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => onOpenImageModal(i)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Change image
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ items: [...data.items, { title: "", image_file: null, image_preview_url: "" }] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Photo
        </button>
      </div>
    </div>
  )
}
