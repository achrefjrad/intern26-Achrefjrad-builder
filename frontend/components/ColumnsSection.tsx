'use client'

import { useState } from "react"

/* eslint-disable @next/next/no-img-element */

import InlineTextEdit from "@/components/InlineTextEdit"
import SectionHeading from "@/components/SectionHeading"
import ColumnCarousel from "@/components/ColumnCarousel"
import ChangeImageBadge from "@/components/ChangeImageBadge"
import { useTheme, themeRadiusClass } from "@/components/theme"
import { getImageUrl } from "@/components/imageUrl"
import type { ColumnItem, ColumnsSectionData } from "@/components/types"

export default function ColumnsSection({
  data,
  gridClasses,
  onTitleChange,
  onSubtitleChange,
  onColumnTitleChange,
  onTextChange,
  onChangeImage,
  onSwapColumns,
}: {
  data: ColumnsSectionData
  gridClasses: Record<number, string>
  onTitleChange: (text: string) => void
  onSubtitleChange: (text: string) => void
  onColumnTitleChange: (position: number, text: string) => void
  onTextChange: (position: number, text: string) => void
  onChangeImage: (index: number) => void
  onSwapColumns: (fromIndex: number, toIndex: number) => void
}) {
  const theme = useTheme()
  const radius = themeRadiusClass[theme.border_radius] ?? themeRadiusClass.lg
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const clearDragState = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const cols = data.columns.slice(0, data.column_count)

  const renderImage = (col: ColumnItem, index: number) => {
    if (col.content_type === "slider") {
      return (
        <div
          className={`relative w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-100 shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg group-hover:ring-indigo-200 transition-all duration-300 cursor-pointer ${radius}`}
          onClick={() => onChangeImage(index)}
        >
          {col.images.length ? (
            <ColumnCarousel images={col.images} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          )}
          <ChangeImageBadge onClick={() => onChangeImage(index)} label="Change Image" />
        </div>
      )
    }
    return (
      <div
        className={`relative w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-100 shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg group-hover:ring-indigo-200 transition-all duration-300 cursor-pointer ${radius}`}
        onClick={() => onChangeImage(index)}
      >
        {col.image_preview_url ? (
          <img src={getImageUrl(col.image_preview_url)} alt={col.title || `Feature ${col.position}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        <ChangeImageBadge onClick={() => onChangeImage(index)} label="Change Image" />
      </div>
    )
  }

  const renderText = (col: ColumnItem) => (
    <>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        <InlineTextEdit
          value={col.title}
          onChange={(text) => onColumnTitleChange(col.position, text)}
          emptyPlaceholder="Titre de colonne"
          className="text-xl font-semibold text-slate-900"
          ariaLabel={`Column ${col.position} title`}
        />
      </h3>
      {col.content_type !== "image_only" && (
        <p className="text-slate-700 leading-relaxed max-w-xs mx-auto">
          <InlineTextEdit
            value={col.text}
            onChange={(text) => onTextChange(col.position, text)}
            emptyPlaceholder="No description provided"
            multiline
            className="text-slate-700 leading-relaxed"
            ariaLabel={`Column ${col.position} text`}
          />
        </p>
      )}
    </>
  )

  if (data.layout_style === "alternating_rows") {
    return (
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeading title={data.title} subtitle={data.subtitle} onTitleChange={onTitleChange} onSubtitleChange={onSubtitleChange} />
          <div className="space-y-16">
            {cols.map((col, index) => {
              const flip = index % 2 === 1
              return (
                <div key={col.position} className={`grid grid-cols-1 md:grid-cols-2 items-center gap-8 ${flip ? "md:[direction:rtl]" : ""}`}>
                  <div className="[direction:ltr] group">
                    {col.content_type === "text_only" ? null : (
                      <div
                        className={`relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg transition-all duration-300 cursor-pointer ${radius}`}
                        onClick={() => onChangeImage(index)}
                      >
                        {col.image_preview_url ? (
                          <img src={getImageUrl(col.image_preview_url)} alt={col.title} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                        <ChangeImageBadge onClick={() => onChangeImage(index)} label="Change Image" />
                      </div>
                    )}
                  </div>
                  <div className="[direction:ltr]">
                    {col.content_type === "image_only" ? (
                      <div
                        className={`relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer ${radius}`}
                        onClick={() => onChangeImage(index)}
                      >
                        {col.image_preview_url ? (
                          <img src={getImageUrl(col.image_preview_url)} alt={col.title} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                            <span className="text-xs text-slate-400">Add image</span>
                          </div>
                        )}
                        <ChangeImageBadge onClick={() => onChangeImage(index)} label="Change Image" />
                      </div>
                    ) : (
                      renderText(col)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  if (data.layout_style === "asymmetric_featured") {
    const [main, ...rest] = cols
    return (
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeading title={data.title} subtitle={data.subtitle} onTitleChange={onTitleChange} onSubtitleChange={onSubtitleChange} />
          {main && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer ${radius}`} onClick={() => onChangeImage(0)}>
                {main.image_preview_url ? (
                  <img src={getImageUrl(main.image_preview_url)} alt={main.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                    <span className="text-xs text-slate-400">Add main image</span>
                  </div>
                )}
                <ChangeImageBadge onClick={() => onChangeImage(0)} label="Change Image" />
              </div>
              <div className="flex flex-col justify-center text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  <InlineTextEdit value={main.title} onChange={(text) => onColumnTitleChange(main.position, text)} emptyPlaceholder="Titre principal" className="text-2xl font-bold text-slate-900" ariaLabel="Main column title" />
                </h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  <InlineTextEdit value={main.text} onChange={(text) => onTextChange(main.position, text)} emptyPlaceholder="Description principale" multiline className="text-slate-600 leading-relaxed text-lg" ariaLabel="Main column text" />
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rest.map((col, i) => (
              <div key={col.position} className={`group flex flex-col items-center text-center border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${radius}`}>
                <div className={`relative aspect-[4/3] w-full rounded-xl overflow-hidden mb-4 cursor-pointer ${radius}`} onClick={() => onChangeImage(i + 1)}>
                  {col.image_preview_url ? (
                    <img src={getImageUrl(col.image_preview_url)} alt={col.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                      <span className="text-xs text-slate-400">Add image</span>
                    </div>
                  )}
                  <ChangeImageBadge onClick={() => onChangeImage(i + 1)} label="Change Image" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  <InlineTextEdit value={col.title} onChange={(text) => onColumnTitleChange(col.position, text)} emptyPlaceholder="Titre" className="text-lg font-semibold text-slate-900" ariaLabel={`Column ${col.position} title`} />
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  <InlineTextEdit value={col.text} onChange={(text) => onTextChange(col.position, text)} emptyPlaceholder="Description" multiline className="text-slate-600 text-sm" ariaLabel={`Column ${col.position} text`} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeading title={data.title} subtitle={data.subtitle} onTitleChange={onTitleChange} onSubtitleChange={onSubtitleChange} />
        <div className={gridClasses[data.column_count]}>
          {cols.map((col, index) => (
            <div
              key={col.position}
              draggable
              onDragStart={(e) => {
                const target = e.target as HTMLElement
                if (target.closest("button, input, textarea, [draggable='false']")) {
                  e.preventDefault()
                  return
                }
                setDraggedIndex(index)
                e.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (dragOverIndex !== index) setDragOverIndex(index)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverIndex === index) setDragOverIndex(null)
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (draggedIndex !== null && draggedIndex !== index) {
                  onSwapColumns(draggedIndex, index)
                }
                clearDragState()
              }}
              onDragEnd={clearDragState}
              className={`group flex flex-col items-center text-center w-full relative rounded-2xl hover:cursor-grab active:cursor-grabbing transition-opacity duration-200 ${
                draggedIndex === index ? "opacity-50" : ""
              } ${dragOverIndex === index ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
            >
              <div
                className="absolute top-2 left-2 z-20 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
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
              {renderImage(col, index)}
              {renderText(col)}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
