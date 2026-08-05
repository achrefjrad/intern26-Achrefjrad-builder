'use client'

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"

const API_URL = "http://127.0.0.1:8000/api/config/"
const API_ORIGIN = "http://127.0.0.1:8000"

const getImageUrl = (path: string | null): string => {
  if (!path) return ""
  if (/^(https?:|data:|blob:|file:)/i.test(path)) return path
  const encodeSegments = (p: string) => p.split("/").map(encodeURIComponent).join("/")
  if (path.startsWith("/")) return `${API_ORIGIN}${encodeSegments(path)}`
  return `${API_ORIGIN}/media/${encodeSegments(path)}`
}

type SectionType = "hero" | "columns" | "overlay"

type HeroData = {
  hero_type?: string
  hero_images?: string[]
  hero_title?: string
  hero_subtitle?: string
  hero_text_color?: string
  hero_font_family?: string
  hero_font_size?: string
}

type ColumnView = {
  id?: number
  position: number
  content_type?: string
  image?: string
  images?: string[]
  text?: string
}

type ColumnsData = {
  column_count?: number
  columns?: ColumnView[]
}

type OverlayData = {
  images?: string[]
  title?: string
  subtitle?: string
  font_size?: string
  text_color?: string
  font_family?: string
}

type SectionItem = {
  id: string
  type: SectionType
  data: HeroData | ColumnsData | OverlayData
}

type ConfigData = {
  sections?: SectionItem[]
}

const gridClasses: Record<number, string> = {
  1: "grid grid-cols-1 max-w-xl mx-auto gap-8",
  2: "grid grid-cols-1 md:grid-cols-2 gap-8",
  3: "grid grid-cols-1 md:grid-cols-3 gap-8",
  4: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8",
}

const sizeClasses: Record<string, string> = {
  sm: "text-3xl md:text-4xl",
  md: "text-4xl md:text-5xl",
  lg: "text-4xl md:text-6xl",
  xl: "text-5xl md:text-7xl",
}

const subSizeClasses: Record<string, string> = {
  sm: "text-base md:text-lg",
  md: "text-lg md:text-xl",
  lg: "text-lg md:text-2xl",
  xl: "text-xl md:text-2xl",
}

export default function VisuelPage() {
  const [data, setData] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500">Loading preview...</p>
        </div>
      </div>
    )
  }

  const sections = data?.sections ?? []

  if (!sections.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-800">Aucune configuration disponible</h1>
        <p className="text-sm text-slate-500 mt-1">Générez et publiez un site depuis le Page Builder.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {sections.map((sec) => {
        if (sec.type === "hero") return <VisuelHero key={sec.id} data={sec.data as HeroData} />
        if (sec.type === "columns") return <VisuelColumns key={sec.id} data={sec.data as ColumnsData} />
        if (sec.type === "overlay") return <VisuelOverlay key={sec.id} data={sec.data as OverlayData} />
        return null
      })}
    </div>
  )
}

function VisuelHero({ data }: { data: HeroData }) {
  const heroType = data.hero_type || "image"
  const heroImage = data.hero_images?.[0] ? getImageUrl(data.hero_images[0]) : null
  const heroTitle = data.hero_title || ""
  const heroSubtitle = data.hero_subtitle || ""
  const titleSize = sizeClasses[data.hero_font_size ?? "xl"] ?? sizeClasses.xl
  const subtitleSize = subSizeClasses[data.hero_font_size ?? "xl"] ?? subSizeClasses.xl
  const fontFamily =
    data.hero_font_family === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : data.hero_font_family === "monospace"
        ? "'Fira Code', Consolas, monospace"
        : data.hero_font_family === "playfair"
          ? "'Playfair Display', Georgia, serif"
          : "'Inter', system-ui, sans-serif"
  const textStyle = { color: data.hero_text_color || "#ffffff", fontFamily }

  return (
    <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden flex items-center justify-center">
      {heroImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url("${heroImage}")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        </>
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950"
          style={{ opacity: heroType === "text" ? 1 : undefined }}
        />
      )}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99,102,241,0.4) 0%, transparent 50%)`
      }} />
      <div className="relative text-center px-6 max-w-3xl">
        <h1 className={`font-bold tracking-tight mb-4 ${titleSize}`} style={textStyle}>
          {heroTitle || "PageBuilder AI"}
        </h1>
        <p className={`${subtitleSize}`} style={{ ...textStyle, opacity: 0.85 }}>
          {heroSubtitle || "Upload a hero banner to get started"}
        </p>
      </div>
    </section>
  )
}

function VisuelOverlay({ data }: { data: OverlayData }) {
  const images = Array.isArray(data.images) && data.images.length ? data.images : null
  const title = data.title || ""
  const subtitle = data.subtitle || ""
  const fontFamily =
    data.font_family === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : data.font_family === "monospace"
        ? "'Fira Code', Consolas, monospace"
        : data.font_family === "playfair"
          ? "'Playfair Display', Georgia, serif"
          : "'Inter', system-ui, sans-serif"
  const textStyle = { color: data.text_color || "#ffffff", fontFamily }
  const titleSize =
    ({
      sm: "text-lg md:text-2xl",
      md: "text-2xl md:text-3xl",
      lg: "text-3xl md:text-4xl",
      xl: "text-4xl md:text-6xl",
    }[data.font_size as "sm" | "md" | "lg" | "xl"] as string | undefined) ?? "text-3xl md:text-4xl"

  return (
    <section
      className="relative w-full py-24 px-6 overflow-hidden"
      style={images ? { backgroundImage: `url("${getImageUrl(images[0])}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {!images && <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />}
      {images && <div className="absolute inset-0 bg-slate-900/70" />}
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className={`font-bold tracking-tight ${titleSize}`} style={textStyle}>
          {title || "Prêt à démarrer ?"}
        </h2>
        {subtitle && <p className="mt-3" style={{ ...textStyle, opacity: 0.8 }}>{subtitle}</p>}
      </div>
    </section>
  )
}

function VisuelColumns({ data }: { data: ColumnsData }) {
  const columnCount = Math.min(Math.max(Number(data.column_count) || 4, 1), 4)
  const columns = Array.isArray(data.columns) ? [...data.columns].sort((a, b) => a.position - b.position) : []

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Features</h2>
          <p className="mt-3 text-slate-500 text-lg max-w-lg mx-auto">Everything you need to showcase your work</p>
        </div>
        <div className={gridClasses[columnCount]}>
          {columns.slice(0, columnCount).map((col) => {
            const colImage = col.image ? getImageUrl(col.image) : null
            return (
              <div key={col.id ?? col.position} className="group flex flex-col items-center text-center">
                {col.content_type === "slider" ? (
                  col.images?.[0] && (
                    <div className="w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-100 shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg group-hover:ring-indigo-200 transition-all duration-300">
                      <img src={getImageUrl(col.images[0])} alt={`Feature ${col.position}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )
                ) : col.content_type !== "text_only" && (
                  <div className="w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-100 shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg group-hover:ring-indigo-200 transition-all duration-300">
                    {colImage ? (
                      <img src={colImage} alt={`Feature ${col.position}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                {col.content_type !== "image_only" && col.content_type !== "slider" && (
                  <div className={col.content_type === "text_only" ? "py-8" : ""}>
                    {col.content_type === "text_only" && (
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                      </div>
                    )}
                    <p className="text-slate-700 leading-relaxed max-w-xs mx-auto">
                      {col.text || "No description provided"}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
