'use client'

import { useState } from "react"
import type { SectionType, ContentType } from "@/components/types"
import type { UploadFiles } from "@/types/builder"

export function ImageUploadModal({
  sectionId,
  sectionType,
  columnCount,
  contentTypes,
  targetColumnIndex,
  itemCount,
  targetItemIndex,
  onSkip,
  onApply,
}: {
  sectionId: string
  sectionType: SectionType
  columnCount: number
  contentTypes?: Record<number, ContentType>
  targetColumnIndex?: number
  itemCount?: number
  targetItemIndex?: number
  onSkip: () => void
  onApply: (files: UploadFiles, sectionId: string, sectionType: SectionType) => Promise<boolean>
}) {
  const [heroImages, setHeroImages] = useState<(File | null)[]>([null, null, null])
  const [columnImages, setColumnImages] = useState<Record<number, File | null>>({})
  const [sliderImages, setSliderImages] = useState<Record<number, (File | null)[]>>({})
  const [overlayImages, setOverlayImages] = useState<(File | null)[]>([null])
  const [galleryImages, setGalleryImages] = useState<Record<number, File | null>>({})
  const [uploading, setUploading] = useState(false)

  const setHero = (index: number, file: File | null) =>
    setHeroImages((prev) => prev.map((f, i) => (i === index ? file : f)))
  const setColumn = (position: number, file: File | null) =>
    setColumnImages((prev) => ({ ...prev, [position]: file }))
  const setSlider = (position: number, index: number, file: File | null) =>
    setSliderImages((prev) => {
      const current = prev[position] ?? [null, null, null]
      const next = current.map((f, i) => (i === index ? file : f))
      return { ...prev, [position]: next }
    })
  const setOverlay = (index: number, file: File | null) =>
    setOverlayImages((prev) => prev.map((f, i) => (i === index ? file : f)))
  const setGallery = (index: number, file: File | null) =>
    setGalleryImages((prev) => ({ ...prev, [index]: file }))

  const handleApply = async () => {
    setUploading(true)
    const ok = await onApply({ heroImages, columnImages, sliderImages, overlayImages, galleryImages }, sectionId, sectionType)
    if (!ok) setUploading(false)
  }

  const uploadSlot = (
    key: string,
    label: string,
    file: File | null,
    onFile: (file: File | null) => void
  ) => (
    <label
      key={key}
      className="flex items-center justify-between gap-3 border border-dashed border-slate-300 rounded-lg px-3 py-2.5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition"
    >
      <span className="text-sm text-slate-700 truncate">{file ? file.name : label}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <span className="text-xs font-medium text-indigo-600 shrink-0">{file ? "Change" : "Choose"}</span>
    </label>
  )

  let title = "Section"
  if (sectionType === "hero") title = "Hero Banner"
  else if (sectionType === "columns") title = targetColumnIndex !== undefined ? `Colonne ${targetColumnIndex + 1}` : "Feature Columns"
  else if (sectionType === "gallery") title = targetItemIndex !== undefined ? `Photo ${targetItemIndex + 1}` : "Photo Gallery"
  else if (sectionType === "testimonials") title = "Testimonials"
  else if (sectionType === "stats") title = "Stats & Metrics"
  else title = "Background Overlay"

  const columnPositions =
    targetColumnIndex !== undefined
      ? [targetColumnIndex + 1]
      : Array.from({ length: columnCount }, (_, i) => i + 1)

  const galleryIndices =
    targetItemIndex !== undefined
      ? [targetItemIndex]
      : Array.from({ length: itemCount ?? 1 }, (_, i) => i)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Add Images to {title} (Optional)</h2>
          <p className="text-sm text-slate-500 mt-1">Ajoutez vos images ou ignorez cette étape pour garder des espaces vides.</p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {sectionType === "hero" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Hero Banner <span className="text-slate-400 font-normal">(jusqu&apos;à 3 images)</span></h3>
              <div className="space-y-2">
                {heroImages.map((file, i) => uploadSlot(`hero-${i}`, `Image ${i + 1}`, file, (f) => setHero(i, f)))}
              </div>
            </div>
          )}

          {sectionType === "columns" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                {targetColumnIndex !== undefined
                  ? `Colonne ${targetColumnIndex + 1}`
                  : <>Columns <span className="text-slate-400 font-normal">({columnCount} image{columnCount > 1 ? "s" : ""})</span></>}
              </h3>
              <div className="space-y-3">
                {columnPositions.map((position) => {
                  const contentType = contentTypes?.[position]
                  if (contentType === "text_only") return null
                  const isSlider = contentType === "slider"
                  const slots = sliderImages[position] ?? [null, null, null]
                  if (isSlider) {
                    return (
                      <div key={`col-${position}`} className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Column {position} slider <span className="text-slate-400 font-normal normal-case">(jusqu&apos;à 3 images)</span></p>
                        {slots.map((file, i) =>
                          uploadSlot(`col-${position}-slide-${i}`, `Slide image ${i + 1}`, file, (f) => setSlider(position, i, f))
                        )}
                      </div>
                    )
                  }
                  return uploadSlot(`col-${position}`, `Column ${position} image`, columnImages[position] ?? null, (f) => setColumn(position, f))
                })}
              </div>
            </div>
          )}

          {sectionType === "gallery" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                {targetItemIndex !== undefined
                  ? `Photo ${targetItemIndex + 1}`
                  : <>Gallery <span className="text-slate-400 font-normal">({galleryIndices.length} photo{galleryIndices.length > 1 ? "s" : ""})</span></>}
              </h3>
              <div className="space-y-2">
                {galleryIndices.map((i) =>
                  uploadSlot(`gallery-${i}`, `Photo ${i + 1}`, galleryImages[i] ?? null, (f) => setGallery(i, f))
                )}
              </div>
            </div>
          )}

          {sectionType === "overlay" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Background Overlay Section <span className="text-slate-400 font-normal">(1 image)</span></h3>
              <div className="space-y-2">
                {overlayImages.map((file, i) => uploadSlot(`overlay-${i}`, "Background image", file, (f) => setOverlay(i, f)))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition"
          >
            Skip / Keep Empty
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading...
              </>
            ) : (
              "Apply Images"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
