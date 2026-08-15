'use client'

import SectionHeading from "@/components/SectionHeading"
import { useTheme, themeRadiusClass } from "@/components/theme"
import type { StatsSectionData } from "@/components/types"

export default function StatsSection({
  data,
  onTitleChange,
}: {
  data: StatsSectionData
  onTitleChange: (text: string) => void
}) {
  const theme = useTheme()
  const radius = themeRadiusClass[theme.border_radius] ?? themeRadiusClass.lg
  const metrics = data.metrics.length ? data.metrics : [{ label: "", value: "" }]

  if (data.layout_style === "banner_stats") {
    return (
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <SectionHeading title={data.title} subtitle="" onTitleChange={onTitleChange} />
          <div className={`${radius} overflow-hidden`} style={{ backgroundColor: theme.primary_color }}>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20">
              {metrics.map((m, i) => (
                <div key={i} className="p-6">
                  <p className="text-3xl md:text-4xl font-bold text-white">{m.value || "0"}</p>
                  <p className="mt-1 text-xs md:text-sm text-white/80 uppercase tracking-wide">{m.label || "Métrique"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} subtitle="" onTitleChange={onTitleChange} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((m, i) => (
            <div key={i} className={`p-6 text-center ${radius} border border-slate-200 bg-white shadow-sm`}>
              <p className="text-3xl md:text-4xl font-bold" style={{ color: theme.primary_color }}>{m.value || "0"}</p>
              <p className="mt-2 text-sm text-slate-500">{m.label || "Métrique"}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
