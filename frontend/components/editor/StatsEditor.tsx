'use client'

import type { StatsSectionData } from "@/components/types"
import { LayoutStyleSelect } from "./LayoutStyleSelect"
import { TextField } from "./TextField"

export function StatsEditor({
  data,
  onChange,
}: {
  data: StatsSectionData
  onChange: (patch: Partial<StatsSectionData>) => void
}) {
  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as StatsSectionData["layout_style"] })}
        options={[
          { value: "metric_grid", label: "Metric Grid" },
          { value: "banner_stats", label: "Banner Stats" },
        ]}
      />
      <div className="mb-6">
        <TextField label="Section Title" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Nos chiffres clés" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.metrics.map((m, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Metric {i + 1}</h3>
              <button
                type="button"
                onClick={() => onChange({ metrics: data.metrics.filter((_, j) => j !== i) })}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Remove
              </button>
            </div>
            <div className="space-y-3">
              <TextField label="Value" value={m.value} onChange={(v) => onChange({ metrics: data.metrics.map((it, j) => (j === i ? { ...it, value: v } : it)) })} placeholder="500+" />
              <TextField label="Label" value={m.label} onChange={(v) => onChange({ metrics: data.metrics.map((it, j) => (j === i ? { ...it, label: v } : it)) })} placeholder="Clients satisfaits" />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange({ metrics: [...data.metrics, { label: "", value: "" }] })}
        className="mt-4 w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
      >
        + Add Metric
      </button>
    </div>
  )
}
