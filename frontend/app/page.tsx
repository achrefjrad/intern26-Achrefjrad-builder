'use client'

import { useState, useEffect, useRef } from "react"
import type { SectionType, ProductData, CatalogCategoryData, HeroSectionData, OverlaySectionData, GallerySectionData, ColumnsSectionData, ColumnItem, ContentType } from "@/components/types"
import type { ConfigState, Toast, ImageModalState, SavedProjectSummary, UploadFiles, SectionInstance, SectionData, AiConfig, SectionPayload } from "@/types/builder"
import { defaultConfigState, defaultCatalog, defaultSectionData, genSectionId } from "@/lib/builderDefaults"
import { isPersistedPath, normalizeTheme, sectionsFromAI, normalizeCatalog, normalizeSection, cloneSectionData, serializeSections } from "@/lib/builderNormalizers"
import { API_ENDPOINTS } from "@/lib/config"
import OrderChatbot from "@/components/OrderChatbot"
import { ConfigPanel } from "@/components/panels/ConfigPanel"
import { CatalogManagerPanel } from "@/components/panels/CatalogManagerPanel"
import { ProductEditorPanel } from "@/components/panels/ProductEditorPanel"
import { LivePreview } from "@/components/LivePreview"
import { SaveProjectModal } from "@/components/modals/SaveProjectModal"
import { SavedProjectsModal } from "@/components/modals/SavedProjectsModal"
import { ImageUploadModal } from "@/components/modals/ImageUploadModal"

const API_URL = API_ENDPOINTS.config
const GENERATE_URL = API_ENDPOINTS.generate
const UPLOAD_URL = API_ENDPOINTS.uploadImages
const PROJECTS_URL = API_ENDPOINTS.projects

export default function BuilderPage() {
  const [configState, setConfigState] = useState<ConfigState>(defaultConfigState)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [aiLoaded, setAiLoaded] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [regenerating, setRegenerating] = useState(false)
  const [imageModal, setImageModal] = useState<ImageModalState>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [currentPage, setCurrentPage] = useState<"home" | "discover" | "product_detail">("home")
  const [activeProductInfo, setActiveProductInfo] = useState<{ categoryIndex: number; productIndex: number } | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<{ categoryIndex: number; productIndex: number } | null>(null)
  const [discoverCategory, setDiscoverCategory] = useState(0)
  const [catalog, setCatalog] = useState<CatalogCategoryData[]>(defaultCatalog())
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false)
  const [savedProjects, setSavedProjects] = useState<SavedProjectSummary[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrefill, setChatPrefill] = useState<string | null>(null)
  const aiAppliedRef = useRef(false)

  useEffect(() => {
    if (aiAppliedRef.current) return
    aiAppliedRef.current = true

    const init = async () => {
      const aiConfigRaw = localStorage.getItem("ai_generated_config")
      if (aiConfigRaw) {
        try {
          const ai = JSON.parse(aiConfigRaw) as AiConfig
          const { sections, theme } = sectionsFromAI(ai)
          setConfigState({ sections, theme })
          if (Array.isArray(ai.catalog) && ai.catalog.length) setCatalog(normalizeCatalog(ai.catalog))
          setPrompt(ai.original_prompt || "")
          setAiLoaded(true)
          localStorage.removeItem("ai_generated_config")
          return
        } catch {
          return
        }
      }

      try {
        const res = await fetch(API_URL)
        const data = await res.json()
        const sections = (data.sections || []).map(normalizeSection).filter(Boolean) as SectionInstance[]
        if (sections.length) {
          setConfigState({ sections, theme: normalizeTheme(data.theme) })
          setPrompt(data.hero_banner?.original_prompt || "")
          return
        }
        const { sections: fallback, theme } = sectionsFromAI(data.hero_banner || {})
        setConfigState({ sections: fallback, theme })
      } catch {
        // ignore network/parse errors, keep default state
      }
    }

    init()
  }, [])

  const updateSectionData = (id: string, patch: Partial<SectionData>) =>
    setConfigState((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === id ? { ...s, data: { ...s.data, ...patch } as SectionData } : s
      ),
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

  const openImageModal = (sec: SectionInstance, targetIndex?: number) => {
    if (sec.type === "columns") {
      const cols = sec.data as ColumnsSectionData
      const contentTypes: Record<number, ContentType> = {}
      cols.columns.forEach((c) => {
        contentTypes[c.position] = c.content_type
      })
      setImageModal({
        sectionId: sec.id,
        sectionType: "columns",
        columnCount: cols.column_count,
        contentTypes,
        targetColumnIndex: targetIndex,
      })
    } else if (sec.type === "gallery") {
      const gallery = sec.data as GallerySectionData
      setImageModal({
        sectionId: sec.id,
        sectionType: "gallery",
        itemCount: gallery.items.length,
        targetItemIndex: targetIndex,
      })
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
      } else if (sec.type === "gallery") {
        const gallery = sec.data as GallerySectionData
        const pending = gallery.items.map((it, i) => ({ it, i })).filter(({ it }) => it.image_file)
        if (!pending.length) {
          result.push(sec)
          continue
        }
        const form = new FormData()
        pending.forEach(({ it, i }) => {
          if (it.image_file) form.append(`column_${i + 1}_image`, it.image_file)
        })
        try {
          const res = await fetch(UPLOAD_URL, { method: "POST", body: form })
          if (res.ok) {
            const json = await res.json()
            result.push({
              ...sec,
              data: {
                ...gallery,
                items: gallery.items.map((it, i) => {
                  if (it.image_file && json.columns?.[i + 1]) {
                    return { ...it, image_file: null, image_preview_url: json.columns[i + 1] }
                  }
                  return it
                }),
              },
            })
            continue
          }
        } catch {
          // fall through
        }
        result.push(sec)
      } else if (sec.type === "columns") {
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
      } else {
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
      const payload = serializeSections(resolved)
      const formData = new FormData()
      formData.append("sections", JSON.stringify(payload))
      formData.append("theme", JSON.stringify(configState.theme))
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
    setProjectName("")
    setSaveModalOpen(true)
  }

  const saveProject = async (name: string) => {
    setSaving(true)
    setToast(null)
    try {
      const resolved = await uploadPendingFiles(configState.sections)
      const payload = serializeSections(resolved)
      const body = {
        project_name: name,
        theme: configState.theme,
        sections: payload,
        catalog,
      }
      const res = await fetch(PROJECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaveModalOpen(false)
        setToast({ type: "success", message: `Project "${name}" saved successfully!` })
      } else {
        let message = "Error saving project."
        try {
          const errData = await res.json()
          if (errData?.error) message = errData.error
        } catch {
          // keep generic message
        }
        setToast({ type: "error", message })
      }
    } catch {
      setToast({ type: "error", message: "Network error." })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const refreshProjects = async () => {
    setProjectsLoading(true)
    try {
      const res = await fetch(PROJECTS_URL)
      if (res.ok) {
        setSavedProjects(await res.json())
      } else {
        setSavedProjects([])
      }
    } catch {
      setSavedProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }

  const openProjectsModal = () => {
    setIsProjectsModalOpen(true)
    void refreshProjects()
  }

  const loadProject = async (name: string) => {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch(`${PROJECTS_URL}${encodeURIComponent(name)}/`)
      if (!res.ok) {
        let message = "Error loading project."
        try {
          const errData = await res.json()
          if (errData?.error) message = errData.error
        } catch {
          // keep generic message
        }
        setToast({ type: "error", message })
        return
      }
      const data = await res.json()
      const sections = ((Array.isArray(data.sections) ? data.sections : []) as SectionPayload[])
        .map(normalizeSection)
        .filter((s): s is SectionInstance => s !== null)
      if (!sections.length) {
        setToast({ type: "error", message: "Ce projet ne contient aucune section valide." })
        return
      }
      setConfigState({ sections, theme: normalizeTheme(data.theme) })
      if (Array.isArray(data.catalog) && data.catalog.length) setCatalog(normalizeCatalog(data.catalog))
      const originalPrompt = typeof data.original_prompt === "string" ? data.original_prompt : ""
      setPrompt(originalPrompt)
      setProjectName(data.name)
      setCurrentPage("home")
      setAiLoaded(true)
      setIsProjectsModalOpen(false)
      setToast({ type: "success", message: `Project "${data.name}" loaded!` })
    } catch {
      setToast({ type: "error", message: "Network error." })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const deleteProject = async (name: string) => {
    setToast(null)
    try {
      const res = await fetch(`${PROJECTS_URL}${encodeURIComponent(name)}/`, { method: "DELETE" })
      if (res.ok) {
        setSavedProjects((prev) => prev.filter((p) => p.name !== name))
        setToast({ type: "success", message: `Project "${name}" deleted.` })
      } else {
        let message = "Error deleting project."
        try {
          const errData = await res.json()
          if (errData?.error) message = errData.error
        } catch {
          // keep generic message
        }
        setToast({ type: "error", message })
      }
    } catch {
      setToast({ type: "error", message: "Network error." })
    } finally {
      setTimeout(() => setToast(null), 4000)
    }
  }

  const updateCatalogCategoryName = (categoryIndex: number, name: string) =>
    setCatalog((prev) => prev.map((c, i) => (i === categoryIndex ? { ...c, name } : c)))

  const updateCatalogProduct = (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) =>
    setCatalog((prev) =>
      prev.map((c, i) =>
        i === categoryIndex
          ? { ...c, products: c.products.map((p, pi) => (pi === productIndex ? { ...p, ...patch } : p)) }
          : c
      )
    )

  const handleViewProductDetail = (categoryIndex: number, productIndex: number) => {
    setActiveProductInfo({ categoryIndex, productIndex })
    setSelectedProduct({ categoryIndex, productIndex })
    setDiscoverCategory(categoryIndex)
    setCurrentPage("product_detail")
  }

  const handleSelectProduct = (categoryIndex: number, productIndex: number) => {
    setSelectedProduct({ categoryIndex, productIndex })
    setDiscoverCategory(categoryIndex)
  }

  const handleOrderProduct = () => {
    const productName = activeProductInfo
      ? catalog[activeProductInfo.categoryIndex]?.products?.[activeProductInfo.productIndex]?.name
      : undefined
    setChatPrefill(`Bonjour, je souhaite commander ${productName || "ce produit"}`)
    setChatOpen(true)
  }

  const handleDecrementStock = (productName: string) => {
    setCatalog((prev) =>
      prev.map((cat) => ({
        ...cat,
        products: cat.products.map((p) =>
          p.name === productName ? { ...p, stock: Math.max(0, (p.stock ?? 0) - 1) } : p
        ),
      }))
    )
  }

  const handleReorderSections = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const next = [...configState.sections]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setConfigState({ ...configState, sections: next })
    void saveConfig(next)
  }

  const handleAddSection = (type: SectionType) => {
    const instance: SectionInstance = { id: genSectionId(type), type, data: defaultSectionData(type) }
    const next = type === "navbar" ? [instance, ...configState.sections] : [...configState.sections, instance]
    setConfigState({ ...configState, sections: next })
    void saveConfig(next)
  }

  const handleDuplicateSection = (id: string) => {
    const next = configState.sections.flatMap((s) =>
      s.id === id ? [s, { id: genSectionId(s.type), type: s.type, data: cloneSectionData(s.data) }] : [s]
    )
    setConfigState({ ...configState, sections: next })
    void saveConfig(next)
  }

  const handleRemoveSection = (id: string) => {
    const next = configState.sections.filter((s) => s.id !== id)
    setConfigState({ ...configState, sections: next })
    void saveConfig(next)
  }

  const handleSwapColumns = (sectionId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const next = configState.sections.map((s) => {
      if (s.id !== sectionId || s.type !== "columns") return s
      const colsData = s.data as ColumnsSectionData
      const cols = colsData.columns.map((c) => ({ ...c }))
      if (fromIndex < 0 || fromIndex >= cols.length || toIndex < 0 || toIndex >= cols.length) return s
      const moved = cols[fromIndex]
      cols[fromIndex] = cols[toIndex]
      cols[toIndex] = moved
      return {
        ...s,
        data: { ...colsData, columns: cols.map((c, i) => ({ ...c, position: i + 1 })) },
      }
    })
    setConfigState({ ...configState, sections: next })
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
      const { sections, theme } = sectionsFromAI(data)
      setConfigState({ sections, theme })
      if (Array.isArray(data.catalog) && data.catalog.length) setCatalog(normalizeCatalog(data.catalog))
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
    } else if (sectionType === "gallery") {
      Object.entries(files.galleryImages).forEach(([index, file]) => {
        if (file) formData.append(`column_${Number(index) + 1}_image`, file)
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
          if (sectionType === "gallery") {
            const gallery = s.data as GallerySectionData
            return {
              ...s,
              data: {
                ...gallery,
                items: gallery.items.map((it, i) => {
                  if (data.columns?.[i + 1]) {
                    return { ...it, image_preview_url: data.columns[i + 1] }
                  }
                  return it
                }),
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
      {!isFullScreen && (
        <aside className="lg:w-2/5 bg-white lg:overflow-y-auto lg:border-r border-slate-200">
          {currentPage === "home" ? (
            <ConfigPanel
              configState={configState}
              saving={saving}
              prompt={prompt}
              regenerating={regenerating}
              activeSectionId={activeSectionId}
              onSelectSection={setActiveSectionId}
              onPromptChange={setPrompt}
              onRegenerate={handleRegenerate}
              onSectionChange={handleSectionChange}
              onColumnChange={handleColumnChange}
              onOpenImageModal={openImageModal}
              onAddSection={handleAddSection}
              onDuplicateSection={handleDuplicateSection}
              onRemoveSection={handleRemoveSection}
              onReorderSections={handleReorderSections}
              onSave={handleSave}
            />
          ) : currentPage === "discover" ? (
            <CatalogManagerPanel
              catalog={catalog}
              selectedProduct={selectedProduct}
              onCategoryNameChange={updateCatalogCategoryName}
              onProductChange={updateCatalogProduct}
              onSelectProduct={handleSelectProduct}
              onViewProductDetail={handleViewProductDetail}
            />
          ) : (
            <ProductEditorPanel
              catalog={catalog}
              activeProductInfo={activeProductInfo ?? selectedProduct}
              onProductChange={updateCatalogProduct}
            />
          )}
        </aside>
      )}
      <main className={`${isFullScreen ? "lg:w-full" : "lg:w-3/5"} lg:overflow-y-auto bg-slate-100`}>
        <LivePreview
          configState={configState}
          aiLoaded={aiLoaded}
          activeSectionId={activeSectionId}
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen((v) => !v)}
          onSelectSection={setActiveSectionId}
          onSectionChange={handleSectionChange}
          onColumnChange={handleColumnChange}
          onOpenImageModal={openImageModal}
          onSwapColumns={handleSwapColumns}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          catalog={catalog}
          onCategoryNameChange={updateCatalogCategoryName}
          onProductChange={updateCatalogProduct}
          activeProductInfo={activeProductInfo}
          onViewProductDetail={handleViewProductDetail}
          onBackToProducts={() => setCurrentPage("discover")}
          selectedProduct={selectedProduct}
          onSelectProduct={handleSelectProduct}
          discoverCategory={discoverCategory}
          onDiscoverCategoryChange={setDiscoverCategory}
          onOpenProjects={openProjectsModal}
          onOrderProduct={handleOrderProduct}
        />
        <OrderChatbot
          open={chatOpen}
          onOpenChange={setChatOpen}
          catalog={catalog}
          projectName={projectName}
          prefillMessage={chatPrefill}
          onDecrementStock={handleDecrementStock}
        />
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
          targetColumnIndex={imageModal.targetColumnIndex}
          itemCount={imageModal.itemCount ?? 1}
          targetItemIndex={imageModal.targetItemIndex}
          onSkip={() => setImageModal(null)}
          onApply={handleApplyImages}
        />
      )}

      {saveModalOpen && (
        <SaveProjectModal
          projectName={projectName}
          saving={saving}
          onProjectNameChange={setProjectName}
          onClose={() => setSaveModalOpen(false)}
          onSave={(name) => void saveProject(name)}
        />
      )}

      {isProjectsModalOpen && (
        <SavedProjectsModal
          projects={savedProjects}
          loading={projectsLoading}
          onClose={() => setIsProjectsModalOpen(false)}
          onRefresh={() => void refreshProjects()}
          onLoad={(name) => void loadProject(name)}
          onDelete={(name) => void deleteProject(name)}
        />
      )}
    </div>
  )
}
