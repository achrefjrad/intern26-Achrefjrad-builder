'use client'

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, type ReactNode } from "react"

const API_URL = "http://127.0.0.1:8000/api/config/"
const GENERATE_URL = "http://127.0.0.1:8000/api/generate/"
const UPLOAD_URL = "http://127.0.0.1:8000/api/upload-images/"
const API_ORIGIN = "http://127.0.0.1:8000"

const getImageUrl = (path: string): string => {
  if (!path) return ""
  if (/^(https?:|data:|blob:|file:)/i.test(path)) return path
  const encodeSegments = (p: string) => p.split("/").map(encodeURIComponent).join("/")
  if (path.startsWith("/")) return `${API_ORIGIN}${encodeSegments(path)}`
  return `${API_ORIGIN}/media/${encodeSegments(path)}`
}

const heroFontFamilies: Record<string, string> = {
  "sans-serif": "'Inter', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  monospace: "'Fira Code', Consolas, monospace",
  playfair: "'Playfair Display', Georgia, serif",
}

const heroTitleSize: Record<string, string> = {
  sm: "text-3xl md:text-4xl",
  md: "text-4xl md:text-5xl",
  lg: "text-4xl md:text-6xl",
  xl: "text-5xl md:text-7xl",
}

const heroSubtitleSize: Record<string, string> = {
  sm: "text-base md:text-lg",
  md: "text-lg md:text-xl",
  lg: "text-lg md:text-2xl",
  xl: "text-xl md:text-2xl",
}

type HeroType = "image" | "text"
type ContentType = "both" | "image_only" | "text_only" | "slider"
type SectionType = "hero" | "columns" | "overlay"
type Size = "sm" | "md" | "lg" | "xl"

type AiColumn = {
  position?: number
  content_type?: string
  text?: string
}

type AiConfig = {
  section_order?: string[]
  hero_type?: string
  hero_title?: string
  hero_subtitle?: string
  hero_text_color?: string
  hero_font_family?: string
  hero_font_size?: string
  column_count?: number
  columns?: AiColumn[]
  overlay_title?: string
  overlay_subtitle?: string
  overlay_text_color?: string
  overlay_font_family?: string
  original_prompt?: string
}

type ColumnPayload = {
  position?: number
  content_type?: string
  image?: string
  images?: string[]
  text?: string
}

type SectionDataPayload = {
  hero_images?: string[]
  hero_type?: string
  hero_title?: string
  hero_subtitle?: string
  hero_text_color?: string
  hero_font_family?: string
  hero_font_size?: string
  column_count?: number
  columns?: ColumnPayload[]
  images?: string[]
  title?: string
  subtitle?: string
  font_size?: string
  text_color?: string
  font_family?: string
}

type SectionPayload = {
  id?: string
  type?: string
  data?: SectionDataPayload
}

const toSize = (value: string | undefined, fallback: Size): Size =>
  value === "sm" || value === "md" || value === "lg" || value === "xl" ? value : fallback

type ColumnItem = {
  position: number
  content_type: ContentType
  image_file: File | null
  image_preview_url: string
  images: string[]
  text: string
}

type HeroSectionData = {
  hero_type: HeroType
  hero_title: string
  hero_subtitle: string
  hero_text_color: string
  hero_font_family: string
  hero_font_size: Size
  hero_image_file: File | null
  hero_image_preview_url: string
  hero_image_preview_urls: string[]
}

type ColumnsSectionData = {
  column_count: number
  columns: ColumnItem[]
}

type OverlaySectionData = {
  overlay_title: string
  overlay_subtitle: string
  overlay_font_size: Size
  overlay_text_color: string
  overlay_font_family: string
  overlay_image_file: File | null
  overlay_image_preview_url: string
  overlay_image_preview_urls: string[]
}

type SectionData = HeroSectionData | ColumnsSectionData | OverlaySectionData

type SectionInstance = {
  id: string
  type: SectionType
  data: SectionData
}

type ConfigState = {
  sections: SectionInstance[]
}

type Toast = { type: "success" | "error"; message: string } | null

type UploadFiles = {
  heroImages: (File | null)[]
  columnImages: Record<number, File | null>
  sliderImages: Record<number, (File | null)[]>
  overlayImages: (File | null)[]
}

type ImageModalState = {
  sectionId: string
  sectionType: SectionType
  columnCount?: number
  contentTypes?: Record<number, ContentType>
} | null

const emptyColumns = (): ColumnItem[] =>
  [1, 2, 3, 4].map((position) => ({
    position,
    content_type: "both",
    image_file: null,
    image_preview_url: "",
    images: [],
    text: "",
  }))

const defaultHeroData = (): HeroSectionData => ({
  hero_type: "image",
  hero_title: "",
  hero_subtitle: "",
  hero_text_color: "#ffffff",
  hero_font_family: "sans-serif",
  hero_font_size: "xl",
  hero_image_file: null,
  hero_image_preview_url: "",
  hero_image_preview_urls: [],
})

const defaultColumnsData = (): ColumnsSectionData => ({
  column_count: 4,
  columns: emptyColumns(),
})

const defaultOverlayData = (): OverlaySectionData => ({
  overlay_title: "",
  overlay_subtitle: "",
  overlay_font_size: "lg",
  overlay_text_color: "#ffffff",
  overlay_font_family: "sans-serif",
  overlay_image_file: null,
  overlay_image_preview_url: "",
  overlay_image_preview_urls: [],
})

const defaultSectionData = (type: SectionType): SectionData =>
  type === "hero" ? defaultHeroData() : type === "columns" ? defaultColumnsData() : defaultOverlayData()

const defaultConfigState: ConfigState = {
  sections: [
    { id: "hero_1", type: "hero", data: defaultHeroData() },
    { id: "columns_1", type: "columns", data: defaultColumnsData() },
    { id: "overlay_1", type: "overlay", data: defaultOverlayData() },
  ],
}

const genSectionId = (type: SectionType): string =>
  `${type}_${
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`

const isPersistedPath = (p: string) => p && !/^(blob:|data:)/.test(p)

const aiColumnsToConfig = (columns?: AiColumn[]): ColumnItem[] => {
  const cols = emptyColumns()
  columns?.forEach((col) => {
    const idx = (col.position ?? 0) - 1
    if (idx >= 0 && idx < 4) {
      cols[idx] = {
        position: col.position ?? idx + 1,
        content_type: (col.content_type as ContentType) || "both",
        image_file: null,
        image_preview_url: "",
        images: [],
        text: col.text || "",
      }
    }
  })
  return cols
}

const sectionsFromAI = (ai: AiConfig): SectionInstance[] => {
  const types = Array.isArray(ai.section_order)
    ? ai.section_order.filter((s) => ["hero", "columns", "overlay"].includes(s))
    : (["hero", "columns", "overlay"] as SectionType[])
  const hero: HeroSectionData = {
    hero_type: ai.hero_type === "text" ? "text" : "image",
    hero_title: ai.hero_title || "",
    hero_subtitle: ai.hero_subtitle || "",
    hero_text_color: ai.hero_text_color || "#ffffff",
    hero_font_family: ai.hero_font_family || "sans-serif",
    hero_font_size: toSize(ai.hero_font_size, "xl"),
    hero_image_file: null,
    hero_image_preview_url: "",
    hero_image_preview_urls: [],
  }
  const columns: ColumnsSectionData = {
    column_count: Math.min(Math.max(Number(ai.column_count) || 4, 1), 4),
    columns: aiColumnsToConfig(ai.columns),
  }
  const overlay: OverlaySectionData = {
    overlay_title: ai.overlay_title || "",
    overlay_subtitle: ai.overlay_subtitle || "",
    overlay_font_size: "lg",
    overlay_text_color: ai.overlay_text_color || "#ffffff",
    overlay_font_family: ai.overlay_font_family || "sans-serif",
    overlay_image_file: null,
    overlay_image_preview_url: "",
    overlay_image_preview_urls: [],
  }
  const map: Record<string, SectionInstance> = {
    hero: { id: "hero_1", type: "hero", data: hero },
    columns: { id: "columns_1", type: "columns", data: columns },
    overlay: { id: "overlay_1", type: "overlay", data: overlay },
  }
  return types.map((t: string) => map[t]).filter(Boolean)
}

const normalizeSection = (sec: SectionPayload): SectionInstance | null => {
  if (!sec || !["hero", "columns", "overlay"].includes(sec.type || "")) return null
  const type = sec.type as SectionType
  const id = sec.id || `${type}_1`
  const raw = sec.data || {}
  if (type === "hero") {
    const images = Array.isArray(raw.hero_images) ? raw.hero_images.filter(isPersistedPath) : []
    const data: HeroSectionData = {
      hero_type: raw.hero_type === "text" ? "text" : "image",
      hero_title: raw.hero_title || "",
      hero_subtitle: raw.hero_subtitle || "",
      hero_text_color: raw.hero_text_color || "#ffffff",
      hero_font_family: raw.hero_font_family || "sans-serif",
      hero_font_size: toSize(raw.hero_font_size, "xl"),
      hero_image_file: null,
      hero_image_preview_url: images[0] || "",
      hero_image_preview_urls: images,
    }
    return { id, type, data }
  }
  if (type === "columns") {
    const column_count = Math.min(Math.max(Number(raw.column_count) || 4, 1), 4)
    const cols = emptyColumns()
    ;(raw.columns || []).forEach((col: ColumnPayload) => {
      const idx = Number(col.position) - 1
      if (idx >= 0 && idx < 4) {
        cols[idx] = {
          position: Number(col.position),
          content_type: ["both", "image_only", "text_only", "slider"].includes(col.content_type || "")
            ? (col.content_type as ContentType)
            : "both",
          image_file: null,
          image_preview_url: col.image || "",
          images: Array.isArray(col.images) ? col.images.filter(isPersistedPath) : [],
          text: col.text || "",
        }
      }
    })
    return { id, type, data: { column_count, columns: cols } as ColumnsSectionData }
  }
  const images = Array.isArray(raw.images) ? raw.images.filter(isPersistedPath) : []
  const data: OverlaySectionData = {
    overlay_title: raw.title || "",
    overlay_subtitle: raw.subtitle || "",
    overlay_font_size: toSize(raw.font_size, "lg"),
    overlay_text_color: raw.text_color || "#ffffff",
    overlay_font_family: raw.font_family || "sans-serif",
    overlay_image_file: null,
    overlay_image_preview_url: images[0] || "",
    overlay_image_preview_urls: images,
  }
  return { id, type, data }
}

const cloneSectionData = (data: SectionData): SectionData => {
  const clone = JSON.parse(JSON.stringify(data))
  if ("hero_type" in clone) {
    clone.hero_image_file = null
    clone.hero_image_preview_urls = (clone.hero_image_preview_urls || []).filter(isPersistedPath)
    clone.hero_image_preview_url = clone.hero_image_preview_urls[0] || ""
  } else if ("column_count" in clone) {
    clone.columns = (clone.columns || []).map((c: ColumnItem) => ({
      ...c,
      image_file: null,
      images: (c.images || []).filter(isPersistedPath),
    }))
  } else {
    clone.overlay_image_file = null
    clone.overlay_image_preview_urls = (clone.overlay_image_preview_urls || []).filter(isPersistedPath)
    clone.overlay_image_preview_url = clone.overlay_image_preview_urls[0] || ""
  }
  return clone
}

export default function BuilderPage() {
  const [configState, setConfigState] = useState<ConfigState>(defaultConfigState)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [aiLoaded, setAiLoaded] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [regenerating, setRegenerating] = useState(false)
  const [imageModal, setImageModal] = useState<ImageModalState>(null)
  const aiAppliedRef = useRef(false)

  useEffect(() => {
    if (aiAppliedRef.current) return
    aiAppliedRef.current = true

    const init = async () => {
      const aiConfigRaw = localStorage.getItem("ai_generated_config")
      if (aiConfigRaw) {
        try {
          const ai = JSON.parse(aiConfigRaw) as AiConfig
          const sections = sectionsFromAI(ai)
          console.log("Loading AI Config from localStorage:", sections)
          setConfigState({ sections })
          setPrompt(ai.original_prompt || "")
          setAiLoaded(true)
          localStorage.removeItem("ai_generated_config")
          return
        } catch {
          console.error("Invalid AI config in localStorage, falling back to API")
        }
      }

      try {
        const res = await fetch(API_URL)
        const data = await res.json()
        const sections = (data.sections || []).map(normalizeSection).filter(Boolean) as SectionInstance[]
        if (sections.length) {
          setConfigState({ sections })
          setPrompt(data.hero_banner?.original_prompt || "")
          return
        }
        setConfigState({ sections: sectionsFromAI(data.hero_banner || {}) })
      } catch {
        // ignore network/parse errors, keep default state
      }
    }

    init()
  }, [])

  const updateSectionData = (id: string, patch: Partial<SectionData>) =>
    setConfigState((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, data: { ...s.data, ...patch } } : s)),
    }))

  const updateSectionColumn = (id: string, position: number, updater: (col: ColumnItem) => ColumnItem) =>
    setConfigState((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === id && s.type === "columns"
          ? {
              ...s,
              data: {
                ...(s.data as ColumnsSectionData),
                columns: (s.data as ColumnsSectionData).columns.map((c) => (c.position === position ? updater(c) : c)),
              },
            }
          : s
      ),
    }))

  const handleSectionChange = (id: string, patch: Partial<SectionData>) => updateSectionData(id, patch)
  const handleColumnChange = (id: string, position: number, updater: (col: ColumnItem) => ColumnItem) =>
    updateSectionColumn(id, position, updater)

  const openImageModal = (sec: SectionInstance) => {
    if (sec.type === "columns") {
      const cols = sec.data as ColumnsSectionData
      const contentTypes: Record<number, ContentType> = {}
      cols.columns.forEach((c) => {
        contentTypes[c.position] = c.content_type
      })
      setImageModal({ sectionId: sec.id, sectionType: "columns", columnCount: cols.column_count, contentTypes })
    } else {
      setImageModal({ sectionId: sec.id, sectionType: sec.type })
    }
  }

  const uploadPendingFiles = async (sections: SectionInstance[]): Promise<SectionInstance[]> => {
    const result: SectionInstance[] = []
    for (const sec of sections) {
      if (sec.type === "hero") {
        const hero = sec.data as HeroSectionData
        if (!hero.hero_image_file) {
          result.push(sec)
          continue
        }
        const form = new FormData()
        form.append("hero_image_0", hero.hero_image_file)
        try {
          const res = await fetch(UPLOAD_URL, { method: "POST", body: form })
          if (res.ok) {
            const json = await res.json()
            const path = json.hero_images?.[0]
            if (path) {
              const urls = [...hero.hero_image_preview_urls.filter(isPersistedPath), path].slice(0, 3)
              result.push({
                ...sec,
                data: {
                  ...hero,
                  hero_image_file: null,
                  hero_image_preview_url: urls[0] || "",
                  hero_image_preview_urls: urls,
                },
              })
              continue
            }
          }
        } catch {
          // fall through to keep section unchanged
        }
        result.push(sec)
      } else if (sec.type === "overlay") {
        const overlay = sec.data as OverlaySectionData
        if (!overlay.overlay_image_file) {
          result.push(sec)
          continue
        }
        const form = new FormData()
        form.append("overlay_image_0", overlay.overlay_image_file)
        try {
          const res = await fetch(UPLOAD_URL, { method: "POST", body: form })
          if (res.ok) {
            const json = await res.json()
            const path = json.overlay_images?.[0]
            if (path) {
              const urls = [...overlay.overlay_image_preview_urls.filter(isPersistedPath), path].slice(0, 3)
              result.push({
                ...sec,
                data: {
                  ...overlay,
                  overlay_image_file: null,
                  overlay_image_preview_url: urls[0] || "",
                  overlay_image_preview_urls: urls,
                },
              })
              continue
            }
          }
        } catch {
          // fall through
        }
        result.push(sec)
      } else {
        const cols = sec.data as ColumnsSectionData
        const pending = cols.columns.filter((c) => c.image_file)
        if (!pending.length) {
          result.push(sec)
          continue
        }
        const form = new FormData()
        pending.forEach((c) => {
          if (c.image_file) form.append(`column_${c.position}_image`, c.image_file)
        })
        try {
          const res = await fetch(UPLOAD_URL, { method: "POST", body: form })
          if (res.ok) {
            const json = await res.json()
            result.push({
              ...sec,
              data: {
                ...cols,
                columns: cols.columns.map((c) => {
                  if (c.image_file && json.columns?.[c.position]) {
                    return { ...c, image_file: null, image_preview_url: json.columns[c.position] }
                  }
                  return c
                }),
              },
            })
            continue
          }
        } catch {
          // fall through
        }
        result.push(sec)
      }
    }
    return result
  }

  const saveConfig = async (sections: SectionInstance[]) => {
    setSaving(true)
    setToast(null)
    try {
      const resolved = await uploadPendingFiles(sections)
      const payload = resolved.map((sec) => {
        const data = JSON.parse(JSON.stringify(sec.data))
        if (sec.type === "hero") {
          data.hero_images = (data.hero_image_preview_urls || []).filter(isPersistedPath)
          delete data.hero_image_file
          delete data.hero_image_preview_url
          delete data.hero_image_preview_urls
        } else if (sec.type === "overlay") {
          data.images = (data.overlay_image_preview_urls || []).filter(isPersistedPath)
          delete data.overlay_image_file
          delete data.overlay_image_preview_url
          delete data.overlay_image_preview_urls
        } else {
          data.columns = (data.columns || []).map((c: ColumnItem) => ({
            position: c.position,
            content_type: c.content_type,
            image: c.image_preview_url && !/^(blob:|data:|https?:)/.test(c.image_preview_url) ? c.image_preview_url : "",
            images: (c.images || []).filter((p: string) => p && !/^(blob:|data:|https?:)/.test(p)),
            text: c.text,
          }))
        }
        return { id: sec.id, type: sec.type, data }
      })
      const formData = new FormData()
      formData.append("sections", JSON.stringify(payload))
      formData.append("original_prompt", prompt)
      const res = await fetch(API_URL, { method: "POST", body: formData })
      if (res.ok) {
        setToast({ type: "success", message: "Configuration saved successfully!" })
      } else {
        setToast({ type: "error", message: "Error saving configuration." })
      }
    } catch {
      setToast({ type: "error", message: "Network error." })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleSave = () => {
    void saveConfig(configState.sections)
  }

  const handleMoveSection = (index: number, direction: -1 | 1) => {
    const next = [...configState.sections]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setConfigState({ sections: next })
    void saveConfig(next)
  }

  const handleAddSection = (type: SectionType) => {
    const instance: SectionInstance = { id: genSectionId(type), type, data: defaultSectionData(type) }
    const next = [...configState.sections, instance]
    setConfigState({ sections: next })
    void saveConfig(next)
  }

  const handleDuplicateSection = (id: string) => {
    const next = configState.sections.flatMap((s) =>
      s.id === id ? [s, { id: genSectionId(s.type), type: s.type, data: cloneSectionData(s.data) }] : [s]
    )
    setConfigState({ sections: next })
    void saveConfig(next)
  }

  const handleRemoveSection = (id: string) => {
    const next = configState.sections.filter((s) => s.id !== id)
    setConfigState({ sections: next })
    void saveConfig(next)
  }

  const handleRegenerate = async () => {
    if (!prompt.trim()) {
      setToast({ type: "error", message: "Enter a prompt first." })
      setTimeout(() => setToast(null), 4000)
      return
    }
    setRegenerating(true)
    setToast(null)
    try {
      const res = await fetch(GENERATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      if (!res.ok) {
        setToast({ type: "error", message: "AI generation failed. Check the backend." })
        return
      }
      const data = await res.json()
      console.log("Regenerated layout:", data)
      const sections = sectionsFromAI(data)
      setConfigState({ sections })
      setPrompt(data.original_prompt || prompt)
      setAiLoaded(true)
      setToast({ type: "success", message: "Layout regenerated!" })
    } catch {
      setToast({ type: "error", message: "Network error." })
    } finally {
      setRegenerating(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleApplyImages = async (
    files: UploadFiles,
    sectionId: string,
    sectionType: SectionType
  ): Promise<boolean> => {
    const formData = new FormData()
    if (sectionType === "hero") {
      files.heroImages.forEach((file, i) => {
        if (file) formData.append(`hero_image_${i}`, file)
      })
    } else if (sectionType === "overlay") {
      files.overlayImages.forEach((file, i) => {
        if (file) formData.append(`overlay_image_${i}`, file)
      })
    } else {
      Object.entries(files.columnImages).forEach(([position, file]) => {
        if (file) formData.append(`column_${position}_image`, file)
      })
      Object.entries(files.sliderImages).forEach(([position, slotFiles]) => {
        slotFiles.forEach((file, k) => {
          if (file) formData.append(`column_${position}_image_${k}`, file)
        })
      })
    }

    try {
      const res = await fetch(UPLOAD_URL, { method: "POST", body: formData })
      if (!res.ok) {
        setToast({ type: "error", message: "Image upload failed." })
        setTimeout(() => setToast(null), 4000)
        return false
      }
      const data = await res.json()
      setConfigState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s
          if (sectionType === "hero") {
            const hero = s.data as HeroSectionData
            const urls = data.hero_images ?? []
            return {
              ...s,
              data: {
                ...hero,
                hero_image_preview_url: urls[0] ?? hero.hero_image_preview_url,
                hero_image_preview_urls: urls.length ? urls : hero.hero_image_preview_urls,
              },
            }
          }
          if (sectionType === "overlay") {
            const overlay = s.data as OverlaySectionData
            const urls = data.overlay_images ?? []
            return {
              ...s,
              data: {
                ...overlay,
                overlay_image_preview_url: (urls[0] ?? data.bg_image) || overlay.overlay_image_preview_url,
                overlay_image_preview_urls: urls.length
                  ? urls
                  : data.bg_image
                    ? [data.bg_image]
                    : overlay.overlay_image_preview_urls,
              },
            }
          }
          const cols = s.data as ColumnsSectionData
          return {
            ...s,
            data: {
              ...cols,
              columns: cols.columns.map((col) => {
                let updated = col
                if (data.columns?.[col.position]) {
                  updated = { ...updated, image_preview_url: data.columns[col.position] }
                }
                if (data.column_sliders?.[col.position]?.length) {
                  updated = { ...updated, images: data.column_sliders[col.position] }
                }
                return updated
              }),
            },
          }
        }),
      }))
      setImageModal(null)
      setToast({ type: "success", message: "Images applied to your layout!" })
      setTimeout(() => setToast(null), 4000)
      return true
    } catch {
      setToast({ type: "error", message: "Network error during upload." })
      setTimeout(() => setToast(null), 4000)
      return false
    }
  }

  return (
    <div className="lg:flex lg:h-[calc(100vh-3.5rem)] bg-slate-50">
      <aside className="lg:w-2/5 bg-white lg:overflow-y-auto lg:border-r border-slate-200">
        <ConfigPanel
          configState={configState}
          saving={saving}
          prompt={prompt}
          regenerating={regenerating}
          onPromptChange={setPrompt}
          onRegenerate={handleRegenerate}
          onSectionChange={handleSectionChange}
          onColumnChange={handleColumnChange}
          onOpenImageModal={openImageModal}
          onAddSection={handleAddSection}
          onDuplicateSection={handleDuplicateSection}
          onRemoveSection={handleRemoveSection}
          onMoveSection={handleMoveSection}
          onSave={handleSave}
        />
      </aside>
      <main className="lg:w-3/5 lg:overflow-y-auto bg-slate-100">
        <LivePreview configState={configState} aiLoaded={aiLoaded} />
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}>
            {toast.type === "success" ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      {imageModal && (
        <ImageUploadModal
          sectionId={imageModal.sectionId}
          sectionType={imageModal.sectionType}
          columnCount={imageModal.columnCount ?? 1}
          contentTypes={imageModal.contentTypes}
          onSkip={() => setImageModal(null)}
          onApply={handleApplyImages}
        />
      )}
    </div>
  )
}

const SECTION_LABELS: Record<SectionType, { name: string; hint: string }> = {
  hero: { name: "Hero Banner", hint: "Bannière principale" },
  columns: { name: "Feature Columns", hint: "Sections de fonctionnalités" },
  overlay: { name: "Background Overlay", hint: "Section de mise en valeur" },
}

function ConfigPanel({
  configState,
  saving,
  prompt,
  regenerating,
  onPromptChange,
  onRegenerate,
  onSectionChange,
  onColumnChange,
  onOpenImageModal,
  onAddSection,
  onDuplicateSection,
  onRemoveSection,
  onMoveSection,
  onSave,
}: {
  configState: ConfigState
  saving: boolean
  prompt: string
  regenerating: boolean
  onPromptChange: (value: string) => void
  onRegenerate: () => void
  onSectionChange: (id: string, patch: Partial<SectionData>) => void
  onColumnChange: (id: string, position: number, updater: (col: ColumnItem) => ColumnItem) => void
  onOpenImageModal: (section: SectionInstance) => void
  onAddSection: (type: SectionType) => void
  onDuplicateSection: (id: string) => void
  onRemoveSection: (id: string) => void
  onMoveSection: (index: number, direction: -1 | 1) => void
  onSave: () => void
}) {
  const [addSectionOpen, setAddSectionOpen] = useState(false)

  return (
    <div className="relative h-full">
      <div className="p-6 pb-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Page Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Customize your hero banner, feature columns and overlay sections</p>
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
            return (
              <section key={sec.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">{label.name}</h2>
                    <p className="text-sm text-slate-500 truncate">{label.hint}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onMoveSection(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${label.name} up`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveSection(index, 1)}
                      disabled={index === configState.sections.length - 1}
                      aria-label={`Move ${label.name} down`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
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
                    onOpenImageModal={() => onOpenImageModal(sec)}
                  />
                )}
                {sec.type === "overlay" && (
                  <OverlayEditor
                    data={sec.data as OverlaySectionData}
                    onChange={(patch) => onSectionChange(sec.id, patch)}
                    onOpenImageModal={() => onOpenImageModal(sec)}
                  />
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
              Save & Publish
            </>
          )}
        </button>
      </div>

      {addSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Add Section</h2>
              <p className="text-sm text-slate-500 mt-1">Choose the type of section to append to your page.</p>
            </div>
            <div className="px-6 py-5 space-y-2">
              {(["hero", "columns", "overlay"] as SectionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAddSection(type)
                    setAddSectionOpen(false)
                  }}
                  className="w-full flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-indigo-400 hover:bg-indigo-50/30 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {type === "hero" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                      ) : type === "columns" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                      )}
                    </svg>
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

function HeroEditor({
  data,
  onChange,
  onOpenImageModal,
}: {
  data: HeroSectionData
  onChange: (patch: Partial<HeroSectionData>) => void
  onOpenImageModal: () => void
}) {
  const heroInputRef = useRef<HTMLInputElement>(null)
  const previewUrls = data.hero_image_preview_urls.filter(Boolean)
  const previews = previewUrls.length > 0 ? previewUrls : data.hero_image_preview_url ? [data.hero_image_preview_url] : []

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Banner Type</label>
        <div className="flex gap-2">
          {(["image", "text"] as HeroType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ hero_type: type })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                data.hero_type === type
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type === "image" ? "Image" : "Text"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Taille du texte</label>
          <select
            value={data.hero_font_size}
            onChange={(e) => onChange({ hero_font_size: e.target.value as Size })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Couleur du texte</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.hero_text_color}
              onChange={(e) => onChange({ hero_text_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-1"
            />
            <div className="flex gap-2">
              {["#ffffff", "#f8fafc", "#fde68a", "#fca5a5", "#7dd3fc", "#c084fc", "#34d399", "#000000"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ hero_text_color: color })}
                  aria-label={`Set text color to ${color}`}
                  className={`w-7 h-7 rounded-full border transition ${
                    data.hero_text_color.toLowerCase() === color
                      ? "ring-2 ring-indigo-500 ring-offset-2"
                      : "border-slate-200 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Police de caractère</label>
          <select
            value={data.hero_font_family}
            onChange={(e) => onChange({ hero_font_family: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="sans-serif">Sans-Serif (Modern)</option>
            <option value="serif">Serif (Classic)</option>
            <option value="monospace">Monospace (Code)</option>
            <option value="playfair">Playfair (Elegant)</option>
          </select>
        </div>
      </div>

      {data.hero_type === "image" ? (
        <div>
          <div
            className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition"
            onClick={() => heroInputRef.current?.click()}
          >
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onChange({ hero_image_file: file, hero_image_preview_url: URL.createObjectURL(file) })
              }}
              className="hidden"
            />
            {previews.length >= 2 ? (
              <div className="flex gap-2">
                {previews.map((url, i) => (
                  <div key={url} className="relative flex-1 min-w-0">
                    <img src={getImageUrl(url)} alt={`Hero slide ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    <span className="absolute bottom-1 right-1 text-[10px] font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">
                      {i + 1}/{previews.length}
                    </span>
                  </div>
                ))}
              </div>
            ) : previews.length === 1 ? (
              <div className="relative group">
                <img src={getImageUrl(previews[0])} alt="Hero preview" className="w-full h-40 object-cover rounded-lg" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Click to change</span>
                </div>
              </div>
            ) : (
              <div className="py-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600">Click to upload hero image</p>
                <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (recommended: 1920x800)</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenImageModal}
            className="mt-3 w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            Choose up to 3 hero images
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Title</label>
            <input
              type="text"
              value={data.hero_title}
              onChange={(e) => onChange({ hero_title: e.target.value })}
              placeholder="Enter hero title..."
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Subtitle</label>
            <input
              type="text"
              value={data.hero_subtitle}
              onChange={(e) => onChange({ hero_subtitle: e.target.value })}
              placeholder="Enter hero subtitle..."
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ColumnsEditor({
  data,
  onChange,
  onColumnChange,
  onOpenImageModal,
}: {
  data: ColumnsSectionData
  onChange: (patch: Partial<ColumnsSectionData>) => void
  onColumnChange: (position: number, updater: (col: ColumnItem) => ColumnItem) => void
  onOpenImageModal: () => void
}) {
  const columnInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Columns</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ column_count: n })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                data.column_count === n
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.columns.slice(0, data.column_count).map((col) => (
          <div key={col.position} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-200 hover:shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Column {col.position}</h3>
              <span className="text-xs text-slate-400 font-mono">0{col.position}</span>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Content Type</label>
              <select
                value={col.content_type}
                onChange={(e) => onColumnChange(col.position, (c) => ({ ...c, content_type: e.target.value as ContentType }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              >
                <option value="both">Image & Text</option>
                <option value="image_only">Image Only</option>
                <option value="text_only">Text Only</option>
                <option value="slider">Image Slider</option>
              </select>
            </div>

            {col.content_type === "slider" ? (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Slides ({col.images.length})</span>
                  <button
                    type="button"
                    onClick={onOpenImageModal}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Choose slides
                  </button>
                </div>
                {col.images.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {col.images.map((img, i) => (
                      <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-slate-200">
                        <img src={getImageUrl(img)} alt={`Column ${col.position} slide ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => onColumnChange(col.position, (c) => ({ ...c, images: c.images.filter((_, j) => j !== i) }))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          aria-label={`Remove slide ${i + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400">No slides yet — use &quot;Choose slides&quot; to add up to 3 images.</p>
                  </div>
                )}
              </div>
            ) : col.content_type !== "text_only" && (
              <div
                className="relative border-2 border-dashed border-slate-200 rounded-lg mb-3 aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition overflow-hidden"
                onClick={() => columnInputRefs.current[col.position]?.click()}
              >
                <input
                  ref={(el) => { columnInputRefs.current[col.position] = el }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onColumnChange(col.position, (c) => ({ ...c, image_file: file, image_preview_url: URL.createObjectURL(file) }))
                  }}
                  className="hidden"
                />
                {col.image_preview_url ? (
                  <img src={getImageUrl(col.image_preview_url)} alt={`Column ${col.position}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-6 h-6 mx-auto text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-xs text-slate-400">Upload image</p>
                  </div>
                )}
              </div>
            )}

            {col.content_type !== "image_only" && col.content_type !== "slider" && (
              <textarea
                value={col.text}
                onChange={(e) => onColumnChange(col.position, (c) => ({ ...c, text: e.target.value }))}
                placeholder="Enter description..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition"
                rows={3}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OverlayEditor({
  data,
  onChange,
  onOpenImageModal,
}: {
  data: OverlaySectionData
  onChange: (patch: Partial<OverlaySectionData>) => void
  onOpenImageModal: () => void
}) {
  const overlayInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div
        className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition mb-6"
        onClick={() => overlayInputRef.current?.click()}
      >
        <input
          ref={overlayInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onChange({ overlay_image_file: file, overlay_image_preview_url: URL.createObjectURL(file) })
          }}
          className="hidden"
        />
        {data.overlay_image_preview_url ? (
          <div className="relative group">
            <img src={getImageUrl(data.overlay_image_preview_url)} alt="Overlay preview" className="w-full h-40 object-cover rounded-lg" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Click to change</span>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">Click to upload background image</p>
            <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (recommended: 1920x800)</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenImageModal}
        className="mb-6 w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
      >
        Choose up to 3 background images
      </button>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            type="text"
            value={data.overlay_title}
            onChange={(e) => onChange({ overlay_title: e.target.value })}
            placeholder="Enter overlay title..."
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <input
            type="text"
            value={data.overlay_subtitle}
            onChange={(e) => onChange({ overlay_subtitle: e.target.value })}
            placeholder="Enter overlay subtitle..."
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Taille du texte</label>
          <select
            value={data.overlay_font_size}
            onChange={(e) => onChange({ overlay_font_size: e.target.value as Size })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Couleur du texte</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.overlay_text_color}
              onChange={(e) => onChange({ overlay_text_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-1"
            />
            <div className="flex gap-2">
              {["#ffffff", "#f8fafc", "#fde68a", "#fca5a5", "#7dd3fc", "#c084fc", "#34d399", "#000000"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ overlay_text_color: color })}
                  aria-label={`Set text color to ${color}`}
                  className={`w-7 h-7 rounded-full border transition ${
                    data.overlay_text_color.toLowerCase() === color
                      ? "ring-2 ring-indigo-500 ring-offset-2"
                      : "border-slate-200 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Police de caractère</label>
          <select
            value={data.overlay_font_family}
            onChange={(e) => onChange({ overlay_font_family: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="sans-serif">Sans-Serif (Modern)</option>
            <option value="serif">Serif (Classic)</option>
            <option value="monospace">Monospace (Code)</option>
            <option value="playfair">Playfair (Elegant)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function LivePreview({ configState, aiLoaded }: { configState: ConfigState; aiLoaded: boolean }) {
  const gridClasses: Record<number, string> = {
    1: "grid grid-cols-1 max-w-xl mx-auto gap-8",
    2: "grid grid-cols-1 md:grid-cols-2 gap-8",
    3: "grid grid-cols-1 md:grid-cols-3 gap-8",
    4: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8",
  }

  return (
    <div className="min-h-full bg-white">
      <div className="sticky top-0 z-10 px-4 py-2 flex items-center justify-center pointer-events-none">
        {aiLoaded ? (
          <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur shadow-sm">
            ✨ Design généré par l&apos;IA — Cliquez sur &apos;Save & Publish&apos; pour enregistrer
          </span>
        ) : (
          <span className="bg-slate-800/80 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur">
            Live Preview
          </span>
        )}
      </div>

      {configState.sections.map((sec) => {
        switch (sec.type) {
          case "hero":
            return <HeroSection key={sec.id} data={sec.data as HeroSectionData} />
          case "columns":
            return <ColumnsSection key={sec.id} data={sec.data as ColumnsSectionData} gridClasses={gridClasses} />
          case "overlay":
            return <OverlaySection key={sec.id} data={sec.data as OverlaySectionData} />
          default:
            return null
        }
      })}
    </div>
  )
}

function OverlaySection({ data }: { data: OverlaySectionData }) {
  const overlayImages = data.overlay_image_preview_urls.length
    ? data.overlay_image_preview_urls
    : data.overlay_image_preview_url
      ? [data.overlay_image_preview_url]
      : []
  const fontFamilies: Record<string, string> = {
    "sans-serif": "'Inter', system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    monospace: "'Fira Code', Consolas, monospace",
    playfair: "'Playfair Display', Georgia, serif",
  }
  const sizeClasses: Record<string, string> = {
    sm: "text-lg md:text-2xl",
    md: "text-2xl md:text-3xl",
    lg: "text-3xl md:text-4xl",
    xl: "text-4xl md:text-6xl",
  }
  const fontFamily = fontFamilies[data.overlay_font_family] ?? fontFamilies["sans-serif"]
  const textStyle = {
    color: data.overlay_text_color,
    fontFamily,
  }
  const subStyle = {
    color: data.overlay_text_color,
    fontFamily,
    opacity: 0.8,
  }
  const content = (
    <div className="relative max-w-3xl mx-auto text-center">
      <h2 className={`font-bold tracking-tight ${sizeClasses[data.overlay_font_size] ?? sizeClasses.lg}`} style={textStyle}>
        {data.overlay_title || "Prêt à démarrer ?"}
      </h2>
      <p className="mt-3" style={subStyle}>
        {data.overlay_subtitle || "Ajoutez une image de fond pour mettre en valeur cette section."}
      </p>
    </div>
  )

  if (overlayImages.length === 0) {
    return (
      <section className="relative w-full py-24 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99,102,241,0.4) 0%, transparent 50%)`,
          }}
        />
        {content}
      </section>
    )
  }

  if (overlayImages.length === 1) {
    return (
      <section
        className="relative w-full py-24 px-6 overflow-hidden"
        style={{ backgroundImage: `url("${getImageUrl(overlayImages[0])}")`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-slate-900/70" />
        {content}
      </section>
    )
  }

  return <OverlayCarousel images={overlayImages} content={content} />
}

function OverlayCarousel({
  images,
  content,
}: {
  images: string[]
  content: ReactNode
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 4000)
    return () => clearInterval(id)
  }, [images.length])

  return (
    <section className="relative w-full py-24 px-6 overflow-hidden">
      {images.map((url, i) => (
        <div
          key={`${i}-${url}`}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url("${getImageUrl(url)}")`, opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-slate-900/70" />
      {content}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  )
}

function HeroSection({ data }: { data: HeroSectionData }) {
  const heroFont = heroFontFamilies[data.hero_font_family] ?? heroFontFamilies["sans-serif"]
  const heroTitleStyle = { color: data.hero_text_color, fontFamily: heroFont }
  const heroSubtitleStyle = { color: data.hero_text_color, fontFamily: heroFont, opacity: 0.85 }
  const titleSize = heroTitleSize[data.hero_font_size] ?? heroTitleSize.xl
  const subtitleSize = heroSubtitleSize[data.hero_font_size] ?? heroSubtitleSize.xl

  if (data.hero_type === "text") {
    return (
      <section className="relative w-full h-[60vh] min-h-[400px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 flex items-center justify-center">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 60%)`
        }} />
        <div className="text-center px-6 relative max-w-3xl">
          <h1 className={`font-bold tracking-tight mb-6 leading-tight ${titleSize}`} style={heroTitleStyle}>
            {data.hero_title || "Welcome"}
          </h1>
          <p className={`max-w-2xl mx-auto leading-relaxed ${subtitleSize}`} style={heroSubtitleStyle}>
            {data.hero_subtitle || "Your one-page website builder"}
          </p>
        </div>
      </section>
    )
  }

  const images = data.hero_image_preview_urls.length
    ? data.hero_image_preview_urls
    : data.hero_image_preview_url
      ? [data.hero_image_preview_url]
      : []

  if (images.length === 0) {
    return (
      <section className="relative w-full h-[60vh] min-h-[400px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99,102,241,0.4) 0%, transparent 50%)`
        }} />
        <div className="text-center px-6 relative">
          <h1 className={`font-bold tracking-tight mb-4 ${titleSize}`} style={heroTitleStyle}>
            {data.hero_title || "Your Title Here"}
          </h1>
          <p className={`${subtitleSize}`} style={heroSubtitleStyle}>
            {data.hero_subtitle || "Upload a hero banner to get started"}
          </p>
        </div>
      </section>
    )
  }

  if (images.length === 1) {
    return (
      <section className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${getImageUrl(images[0])}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className={`font-bold tracking-tight mb-4 ${titleSize}`} style={heroTitleStyle}>
            {data.hero_title || "Your Title Here"}
          </h1>
          <p className={`max-w-xl ${subtitleSize}`} style={heroSubtitleStyle}>
            {data.hero_subtitle || "Your subtitle here"}
          </p>
        </div>
      </section>
    )
  }

  return <HeroCarousel images={images} data={data} />
}

function HeroCarousel({ images, data }: { images: string[]; data: HeroSectionData }) {
  const [index, setIndex] = useState(0)
  const heroFont = heroFontFamilies[data.hero_font_family] ?? heroFontFamilies["sans-serif"]
  const heroTitleStyle = { color: data.hero_text_color, fontFamily: heroFont }
  const heroSubtitleStyle = { color: data.hero_text_color, fontFamily: heroFont, opacity: 0.85 }
  const titleSize = heroTitleSize[data.hero_font_size] ?? heroTitleSize.xl
  const subtitleSize = heroSubtitleSize[data.hero_font_size] ?? heroSubtitleSize.xl

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 4000)
    return () => clearInterval(id)
  }, [images.length])

  return (
    <section className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
      {images.map((url, i) => (
        <div
          key={`${i}-${url}`}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url("${getImageUrl(url)}")`, opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <h1 className={`font-bold tracking-tight mb-4 ${titleSize}`} style={heroTitleStyle}>
          {data.hero_title || "Your Title Here"}
        </h1>
        <p className={`max-w-xl ${subtitleSize}`} style={heroSubtitleStyle}>
          {data.hero_subtitle || "Your subtitle here"}
        </p>
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  )
}

function ColumnCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 4000)
    return () => clearInterval(id)
  }, [images.length])

  if (images.length === 1) {
    return (
      <img src={getImageUrl(images[0])} alt="Slide 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    )
  }

  return (
    <div className="relative w-full h-full">
      {images.map((url, i) => (
        <img
          key={`${i}-${url}`}
          src={getImageUrl(url)}
          alt={`Slide ${i + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function ColumnsSection({
  data,
  gridClasses,
}: {
  data: ColumnsSectionData
  gridClasses: Record<number, string>
}) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Features</h2>
          <p className="mt-3 text-slate-500 text-lg max-w-lg mx-auto">Everything you need to showcase your work</p>
        </div>
        <div className={gridClasses[data.column_count]}>
          {data.columns.slice(0, data.column_count).map((col) => (
            <div key={col.position} className="group flex flex-col items-center text-center w-full">
              {col.content_type === "slider" ? (
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-100 shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg group-hover:ring-indigo-200 transition-all duration-300">
                  {col.images.length ? (
                    <ColumnCarousel images={col.images} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}
                </div>
              ) : col.content_type !== "text_only" && (
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-100 shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg group-hover:ring-indigo-200 transition-all duration-300">
                  {col.image_preview_url ? (
                    <img src={getImageUrl(col.image_preview_url)} alt={`Feature ${col.position}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                <div className={col.content_type === "text_only" ? "py-8 w-full" : "w-full"}>
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
          ))}
        </div>
      </div>
    </section>
  )
}

function ImageUploadModal({
  sectionId,
  sectionType,
  columnCount,
  contentTypes,
  onSkip,
  onApply,
}: {
  sectionId: string
  sectionType: SectionType
  columnCount: number
  contentTypes?: Record<number, ContentType>
  onSkip: () => void
  onApply: (files: UploadFiles, sectionId: string, sectionType: SectionType) => Promise<boolean>
}) {
  const [heroImages, setHeroImages] = useState<(File | null)[]>([null, null, null])
  const [columnImages, setColumnImages] = useState<Record<number, File | null>>({})
  const [sliderImages, setSliderImages] = useState<Record<number, (File | null)[]>>({})
  const [overlayImages, setOverlayImages] = useState<(File | null)[]>([null, null, null])
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

  const handleApply = async () => {
    setUploading(true)
    const ok = await onApply({ heroImages, columnImages, sliderImages, overlayImages }, sectionId, sectionType)
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

  const title = sectionType === "hero" ? "Hero Banner" : sectionType === "columns" ? "Feature Columns" : "Background Overlay"

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
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Columns <span className="text-slate-400 font-normal">({columnCount} image{columnCount > 1 ? "s" : ""})</span></h3>
              <div className="space-y-3">
                {Array.from({ length: columnCount }, (_, i) => i + 1).map((position) => {
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

          {sectionType === "overlay" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Background Overlay Section <span className="text-slate-400 font-normal">(jusqu&apos;à 3 images)</span></h3>
              <div className="space-y-2">
                {overlayImages.map((file, i) => uploadSlot(`overlay-${i}`, `Background image ${i + 1}`, file, (f) => setOverlay(i, f)))}
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
