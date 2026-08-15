'use client'

import type { TestimonialsSectionData } from "@/components/types"
import { LayoutStyleSelect } from "./LayoutStyleSelect"
import { TextField } from "./TextField"

export function TestimonialsEditor({
  data,
  onChange,
}: {
  data: TestimonialsSectionData
  onChange: (patch: Partial<TestimonialsSectionData>) => void
}) {
  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as TestimonialsSectionData["layout_style"] })}
        options={[
          { value: "quote_cards", label: "Quote Cards" },
          { value: "full_width_quote", label: "Full Width Quote" },
        ]}
      />
      <div className="mb-6">
        <TextField label="Section Title" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Ils nous font confiance" />
      </div>
      <div className="space-y-4">
        {data.reviews.map((r, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Review {i + 1}</h3>
              <button
                type="button"
                onClick={() => onChange({ reviews: data.reviews.filter((_, j) => j !== i) })}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Remove
              </button>
            </div>
            <div className="space-y-3">
              <TextField label="Quote" value={r.quote} onChange={(v) => onChange({ reviews: data.reviews.map((it, j) => (j === i ? { ...it, quote: v } : it)) })} placeholder="Citation..." multiline />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Author" value={r.author} onChange={(v) => onChange({ reviews: data.reviews.map((it, j) => (j === i ? { ...it, author: v } : it)) })} placeholder="Nom" />
                <TextField label="Role" value={r.role} onChange={(v) => onChange({ reviews: data.reviews.map((it, j) => (j === i ? { ...it, role: v } : it)) })} placeholder="Rôle" />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ reviews: [...data.reviews, { quote: "", author: "", role: "" }] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Review
        </button>
      </div>
    </div>
  )
}
