'use client'

import { useState } from "react"
import type { SectionType, ColumnItem } from "@/components/types"
import type {
  HeroSectionData,
  ColumnsSectionData,
  GallerySectionData,
  TestimonialsSectionData,
  StatsSectionData,
  OverlaySectionData,
  NavbarSectionData,
  FooterSectionData,
} from "@/components/types"
import type { ConfigState, SectionData, SectionInstance } from "@/types/builder"
import { HeroEditor } from "@/components/editor/HeroEditor"
import { ColumnsEditor } from "@/components/editor/ColumnsEditor"
import { GalleryEditor } from "@/components/editor/GalleryEditor"
import { TestimonialsEditor } from "@/components/editor/TestimonialsEditor"
import { StatsEditor } from "@/components/editor/StatsEditor"
import { OverlayEditor } from "@/components/editor/OverlayEditor"
import { NavbarEditor } from "@/components/editor/NavbarEditor"
import { FooterEditor } from "@/components/editor/FooterEditor"

const SECTION_LABELS: Record<SectionType, { name: string; hint: string; emoji: string }> = {
  navbar: { name: "Barre de navigation", hint: "Top navigation bar with links and CTA", emoji: "🧭" },
  hero: { name: "Hero Banner", hint: "Header banner with CTA", emoji: "🏞️" },
  columns: { name: "Feature Columns", hint: "Grid or asymmetric service cards", emoji: "🎴" },
  gallery: { name: "Photo Gallery", hint: "Grid showcase of images", emoji: "🖼️" },
  testimonials: { name: "Testimonials", hint: "Client reviews and feedback", emoji: "💬" },
  stats: { name: "Stats & Metrics", hint: "Key figures and statistics", emoji: "📊" },
  overlay: { name: "Call to Action Overlay", hint: "Full-width banner", emoji: "📣" },
  footer: { name: "Pied de page", hint: "Footer with links and social icons", emoji: "🏁" },
}

export function ConfigPanel({
  configState,
  saving,
  prompt,
  regenerating,
  activeSectionId,
  onSelectSection,
  onPromptChange,
  onRegenerate,
  onSectionChange,
  onColumnChange,
  onOpenImageModal,
  onAddSection,
  onDuplicateSection,
  onRemoveSection,
  onReorderSections,
  onSave,
}: {
  configState: ConfigState
  saving: boolean
  prompt: string
  regenerating: boolean
  activeSectionId: string | null
  onSelectSection: (id: string | null) => void
  onPromptChange: (value: string) => void
  onRegenerate: () => void
  onSectionChange: (id: string, patch: Partial<SectionData>) => void
  onColumnChange: (id: string, position: number, updater: (col: ColumnItem) => ColumnItem) => void
  onOpenImageModal: (section: SectionInstance, targetIndex?: number) => void
  onAddSection: (type: SectionType) => void
  onDuplicateSection: (id: string) => void
  onRemoveSection: (id: string) => void
  onReorderSections: (fromIndex: number, toIndex: number) => void
  onSave: () => void
}) {
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null)
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null)

  const clearSectionDragState = () => {
    setDraggedSectionIndex(null)
    setDragOverSectionIndex(null)
  }

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const selectSection = (sectionId: string) => {
    onSelectSection(sectionId)
    setCollapsedSections((prev) => (prev[sectionId] ? { ...prev, [sectionId]: false } : prev))
  }

  return (
    <div className="relative h-full">
      <div className="p-6 pb-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Page Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Composez vos sections : bannières, colonnes, galeries, avis, statistiques et CTA.</p>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">AI Prompt</h2>
              <p className="text-sm text-slate-500">Edit your prompt and regenerate the layout</p>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Décrivez le site web que vous voulez générer..."
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition"
          />

          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {regenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Regenerating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Regenerate Layout
              </>
            )}
          </button>
        </section>

        <div className="space-y-6">
          {configState.sections.map((sec, index) => {
            const label = SECTION_LABELS[sec.type]
            const isCollapsed = collapsedSections[sec.id] ?? false
            return (
              <section
                key={sec.id}
                draggable
                onDragStart={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest("input, textarea, select, button, [draggable='false']")) {
                    e.preventDefault()
                    return
                  }
                  setDraggedSectionIndex(index)
                  e.dataTransfer.effectAllowed = "move"
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                  if (dragOverSectionIndex !== index) setDragOverSectionIndex(index)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverSectionIndex === index) setDragOverSectionIndex(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedSectionIndex !== null && draggedSectionIndex !== index) {
                    onReorderSections(draggedSectionIndex, index)
                  }
                  clearSectionDragState()
                }}
                onDragEnd={clearSectionDragState}
                className={`bg-white rounded-xl shadow-sm border border-slate-200 transition-opacity duration-200 ${
                  draggedSectionIndex === index ? "opacity-50" : ""
                } ${dragOverSectionIndex === index ? "ring-2 ring-blue-500 ring-offset-2 rounded-xl" : ""}`}
              >
                <div
                  className={`flex items-center gap-3 p-6 pb-0 cursor-pointer select-none ${sec.id === activeSectionId ? "rounded-t-xl bg-indigo-50/50" : ""}`}
                  onClick={() => {
                    onSelectSection(sec.id)
                    toggleCollapse(sec.id)
                  }}
                  aria-expanded={!isCollapsed}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectSection(sec.id)
                      toggleCollapse(sec.id)
                    }
                  }}
                >
                  <div
                    className="w-6 h-8 flex items-center justify-center text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing flex-shrink-0 transition"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.4" />
                      <circle cx="15" cy="5" r="1.4" />
                      <circle cx="9" cy="12" r="1.4" />
                      <circle cx="15" cy="12" r="1.4" />
                      <circle cx="9" cy="19" r="1.4" />
                      <circle cx="15" cy="19" r="1.4" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">{label.emoji} {label.name}</h2>
                    {!isCollapsed && <p className="text-sm text-slate-500 truncate">{label.hint}</p>}
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onDuplicateSection(sec.id)}
                      aria-label={`Duplicate ${label.name}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSection(sec.id)}
                      aria-label={`Delete ${label.name}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-6" onFocusCapture={() => selectSection(sec.id)}>
                    {sec.type === "hero" && (
                      <HeroEditor
                        data={sec.data as HeroSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                        onOpenImageModal={() => onOpenImageModal(sec)}
                      />
                    )}
                    {sec.type === "columns" && (
                      <ColumnsEditor
                        data={sec.data as ColumnsSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                        onColumnChange={(position, updater) => onColumnChange(sec.id, position, updater)}
                        onOpenImageModal={(columnIndex) => onOpenImageModal(sec, columnIndex)}
                      />
                    )}
                    {sec.type === "gallery" && (
                      <GalleryEditor
                        data={sec.data as GallerySectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                        onOpenImageModal={(itemIndex) => onOpenImageModal(sec, itemIndex)}
                      />
                    )}
                    {sec.type === "testimonials" && (
                      <TestimonialsEditor
                        data={sec.data as TestimonialsSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                    {sec.type === "stats" && (
                      <StatsEditor
                        data={sec.data as StatsSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                    {sec.type === "overlay" && (
                      <OverlayEditor
                        data={sec.data as OverlaySectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                        onOpenImageModal={() => onOpenImageModal(sec)}
                      />
                    )}
                    {sec.type === "navbar" && (
                      <NavbarEditor
                        data={sec.data as NavbarSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                    {sec.type === "footer" && (
                      <FooterEditor
                        data={sec.data as FooterSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setAddSectionOpen(true)}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl px-6 py-3.5 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Section
        </button>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Publishing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Save &amp; Publish
            </>
          )}
        </button>
      </div>

      {addSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Add Section</h2>
              <p className="text-sm text-slate-500 mt-1">
                La barre de navigation est insérée en haut, le pied de page en bas de votre page.
              </p>
            </div>
            <div className="px-6 py-5 space-y-2">
              {(["navbar", "hero", "columns", "gallery", "testimonials", "stats", "overlay", "footer"] as SectionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAddSection(type)
                    setAddSectionOpen(false)
                  }}
                  className="w-full flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-indigo-400 hover:bg-indigo-50/30 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-lg">
                    {SECTION_LABELS[type].emoji}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{SECTION_LABELS[type].name}</p>
                    <p className="text-xs text-slate-500">{SECTION_LABELS[type].hint}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAddSectionOpen(false)}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
