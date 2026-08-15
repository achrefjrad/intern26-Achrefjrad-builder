'use client'

export default function StockStepper({
  value,
  onChange,
  size = "sm",
}: {
  value: number
  onChange: (value: number) => void
  size?: "sm" | "md"
}) {
  const clamp = (n: number) => Math.max(0, Math.min(9999, n))
  const step = (delta: number) => onChange(clamp((Number(value) || 0) + delta))
  const commit = (raw: string) => {
    const parsed = parseInt(raw.replace(/\D/g, ""), 10)
    onChange(clamp(Number.isNaN(parsed) ? 0 : parsed))
  }
  const btnClass = `flex items-center justify-center font-bold text-slate-600 hover:text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition ${
    size === "sm" ? "w-6 h-6 text-sm rounded-md" : "w-9 h-9 text-lg rounded-lg"
  }`
  const inputClass = `w-14 text-center font-semibold border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition ${
    size === "sm" ? "h-6 text-xs" : "h-9 text-sm"
  }`
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" onClick={() => step(-1)} disabled={value <= 0} className={btnClass} aria-label="Diminuer le stock">
        −
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => commit(e.target.value)}
        className={inputClass}
        aria-label="Stock"
      />
      <button type="button" onClick={() => step(1)} className={btnClass} aria-label="Augmenter le stock">
        +
      </button>
    </div>
  )
}
