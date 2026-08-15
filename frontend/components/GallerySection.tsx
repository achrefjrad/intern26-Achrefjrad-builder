'use client'

/* eslint-disable @next/next/no-img-element */

import SectionHeading from "@/components/SectionHeading"
import ChangeImageBadge from "@/components/ChangeImageBadge"
import { useTheme, themeRadiusClass } from "@/components/theme"
import { getImageUrl } from "@/components/imageUrl"
import type { GallerySectionData } from "@/components/types"

export default function GallerySection({
  data,
  onTitleChange,
  onSubtitleChange,
  onChangeImage,
}: {
  data: GallerySectionData
  onTitleChange: (text: string) => void
  onSubtitleChange: (text: string) => void
  onChangeImage: (index: number) => void
}) {
  const theme = useTheme()
  const radius = themeRadiusClass[theme.border_radius] ?? themeRadiusClass.lg

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeading title={data.title} subtitle={data.subtitle} onTitleChange={onTitleChange} onSubtitleChange={onSubtitleChange} />
        {data.layout_style === "row_grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map((item, i) => (
              <div key={i} className={`group relative overflow-hidden ${radius} shadow-sm ring-1 ring-slate-200 hover:shadow-lg transition-all duration-300`}>
                {item.image_preview_url ? (
                  <img src={getImageUrl(item.image_preview_url)} alt={item.title} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-slate-100 flex items-center justify-center">
                    <span className="text-xs text-slate-400">Add photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                  <span className="text-white font-medium">{item.title}</span>
                </div>
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => onChangeImage(i)}
                />
                <ChangeImageBadge onClick={() => onChangeImage(i)} label="Change Image" />
              </div>
            ))}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [&>*]:mb-6">
            {data.items.map((item, i) => (
              <div key={i} className={`group relative break-inside-avoid overflow-hidden ${radius} shadow-sm ring-1 ring-slate-200 hover:shadow-lg transition-all duration-300`}>
                {item.image_preview_url ? (
                  <img src={getImageUrl(item.image_preview_url)} alt={item.title} className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${i % 3 === 1 ? "aspect-[4/5]" : "aspect-[4/3]"}`} />
                ) : (
                  <div className="w-full aspect-[4/3] bg-slate-100 flex items-center justify-center">
                    <span className="text-xs text-slate-400">Add photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                  <span className="text-white font-medium">{item.title}</span>
                </div>
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => onChangeImage(i)}
                />
                <ChangeImageBadge onClick={() => onChangeImage(i)} label="Change Image" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
