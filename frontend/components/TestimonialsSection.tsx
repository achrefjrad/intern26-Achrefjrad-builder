'use client'

import SectionHeading from "@/components/SectionHeading"
import { useTheme, themeRadiusClass } from "@/components/theme"
import type { TestimonialsSectionData } from "@/components/types"

export default function TestimonialsSection({
  data,
  onTitleChange,
}: {
  data: TestimonialsSectionData
  onTitleChange: (text: string) => void
}) {
  const theme = useTheme()
  const radius = themeRadiusClass[theme.border_radius] ?? themeRadiusClass.lg
  const reviews = data.reviews.length ? data.reviews : [{ quote: "", author: "", role: "" }]

  if (data.layout_style === "full_width_quote") {
    const main = reviews[0]
    return (
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <SectionHeading title={data.title} subtitle="" onTitleChange={onTitleChange} />
          <blockquote className={`p-8 md:p-12 ${radius}`} style={{ backgroundColor: theme.primary_color, color: "#ffffff" }}>
            <svg className="w-10 h-10 mx-auto mb-4 opacity-60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
            </svg>
            <p className="text-xl md:text-2xl font-medium leading-relaxed">{main.quote || "Votre citation la plus marquante ici."}</p>
            {main.author && (
              <footer className="mt-6 text-sm font-semibold uppercase tracking-wide opacity-90">
                {main.author}
                {main.role ? <span className="font-normal normal-case opacity-75"> — {main.role}</span> : null}
              </footer>
            )}
          </blockquote>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={data.title} subtitle="" onTitleChange={onTitleChange} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div key={i} className={`p-6 ${radius} shadow-sm ring-1 ring-slate-200 bg-white flex flex-col`}>
              <svg className="w-6 h-6 mb-4" style={{ color: theme.primary_color }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
              </svg>
              <p className="text-slate-700 leading-relaxed flex-1">{r.quote || "Votre citation ici."}</p>
              {(r.author || r.role) && (
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  {r.author}
                  {r.role ? <span className="block text-xs font-normal text-slate-500">{r.role}</span> : null}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
