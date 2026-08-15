'use client'

import { useEffect, useRef, type ReactNode } from "react"
import type {
  ColumnItem,
  CatalogCategoryData,
  ProductData,
  HeroSectionData,
  ColumnsSectionData,
  GallerySectionData,
  TestimonialsSectionData,
  StatsSectionData,
  OverlaySectionData,
  NavbarSectionData,
  FooterSectionData,
} from "@/components/types"
import { ThemeContext, themeFontFamilies } from "@/components/theme"
import type { ConfigState, SectionData, SectionInstance } from "@/types/builder"
import DiscoverSection from "@/components/DiscoverSection"
import ProductDetailSection from "@/components/ProductDetailSection"
import HeroSection from "@/components/HeroSection"
import ColumnsSection from "@/components/ColumnsSection"
import GallerySection from "@/components/GallerySection"
import TestimonialsSection from "@/components/TestimonialsSection"
import StatsSection from "@/components/StatsSection"
import OverlaySection from "@/components/OverlaySection"
import NavbarSection from "@/components/NavbarSection"
import FooterSection from "@/components/FooterSection"

export function LivePreview({
  configState,
  aiLoaded,
  activeSectionId,
  isFullScreen,
  onToggleFullScreen,
  onSelectSection,
  onSectionChange,
  onColumnChange,
  onOpenImageModal,
  onSwapColumns,
  currentPage,
  onPageChange,
  catalog,
  onCategoryNameChange,
  onProductChange,
  activeProductInfo,
  onViewProductDetail,
  onBackToProducts,
  selectedProduct,
  onSelectProduct,
  discoverCategory,
  onDiscoverCategoryChange,
  onOpenProjects,
  onOrderProduct,
}: {
  configState: ConfigState
  aiLoaded: boolean
  activeSectionId: string | null
  isFullScreen: boolean
  onToggleFullScreen: () => void
  onSelectSection: (id: string | null) => void
  onSectionChange: (id: string, patch: Partial<SectionData>) => void
  onColumnChange: (id: string, position: number, updater: (col: ColumnItem) => ColumnItem) => void
  onOpenImageModal: (section: SectionInstance, targetIndex?: number) => void
  onSwapColumns: (sectionId: string, fromIndex: number, toIndex: number) => void
  currentPage: "home" | "discover" | "product_detail"
  onPageChange: (page: "home" | "discover" | "product_detail") => void
  catalog: CatalogCategoryData[]
  onCategoryNameChange: (categoryIndex: number, name: string) => void
  onProductChange: (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) => void
  activeProductInfo: { categoryIndex: number; productIndex: number } | null
  onViewProductDetail: (categoryIndex: number, productIndex: number) => void
  onBackToProducts: () => void
  selectedProduct: { categoryIndex: number; productIndex: number } | null
  onSelectProduct: (categoryIndex: number, productIndex: number) => void
  discoverCategory: number
  onDiscoverCategoryChange: (categoryIndex: number) => void
  onOpenProjects: () => void
  onOrderProduct: () => void
}) {
  const gridClasses: Record<number, string> = {
    1: "grid grid-cols-1 max-w-xl mx-auto gap-8",
    2: "grid grid-cols-1 md:grid-cols-2 gap-8",
    3: "grid grid-cols-1 md:grid-cols-3 gap-8",
    4: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8",
  }

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    if (!activeSectionId) return
    const el = sectionRefs.current[activeSectionId]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeSectionId])

  return (
    <ThemeContext.Provider value={configState.theme}>
      <div
        className="min-h-full"
        style={{
          backgroundColor: configState.theme.background_color,
          fontFamily: themeFontFamilies[configState.theme.font_family] ?? themeFontFamilies["sans-serif"],
        }}
      >
        <div className="sticky top-0 z-10 px-4 py-2 flex items-center gap-3 pointer-events-none">
          <div className="flex-1 min-w-0">
            {aiLoaded ? (
              <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur shadow-sm">
                ✨ Design généré par l&apos;IA — Cliquez sur &apos;Save &amp; Publish&apos; pour enregistrer
              </span>
            ) : (
              <span className="bg-slate-800/80 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur">
                Live Preview
              </span>
            )}
          </div>

          <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-slate-800/80 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition ${
                currentPage === "home" ? "bg-white text-slate-900 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              aria-pressed={currentPage === "home"}
            >
              🏠 Accueil
            </button>
            <button
              type="button"
              onClick={() => onPageChange("discover")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition ${
                currentPage === "discover" ? "bg-white text-slate-900 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              aria-pressed={currentPage === "discover"}
            >
              🛍️ Découvrir
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenProjects}
            className="pointer-events-auto inline-flex items-center gap-1.5 bg-slate-800/80 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur hover:bg-slate-700 transition"
            aria-label="Mes projets"
            title="Mes projets"
          >
            📁 Mes Projets
          </button>

          <button
            type="button"
            onClick={onToggleFullScreen}
            className="pointer-events-auto inline-flex items-center gap-1.5 bg-slate-800/80 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur hover:bg-slate-700 transition"
            aria-label={isFullScreen ? "Quitter plein écran" : "Plein écran"}
            title={isFullScreen ? "Quitter plein écran" : "Plein écran"}
          >
            {isFullScreen ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 4.5H4.5M9 4.5L4.5 9M15 9V4.5M15 4.5H19.5M15 4.5L19.5 9M9 15v4.5M9 19.5H4.5M9 19.5L4.5 15M15 15v4.5m0 0h4.5M15 19.5l4.5-4.5" />
                </svg>
                Quitter plein écran
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                Plein écran
              </>
            )}
          </button>
        </div>

        {currentPage === "discover" ? (
          <DiscoverSection
            catalog={catalog}
            onCategoryNameChange={onCategoryNameChange}
            onProductChange={onProductChange}
            onViewProductDetail={onViewProductDetail}
            selectedProduct={selectedProduct}
            onSelectProduct={onSelectProduct}
            activeCategory={discoverCategory}
            onActiveCategoryChange={onDiscoverCategoryChange}
          />
        ) : currentPage === "product_detail" ? (
          <ProductDetailSection
            catalog={catalog}
            activeProductInfo={activeProductInfo}
            onProductChange={onProductChange}
            onBack={onBackToProducts}
            onOrderProduct={onOrderProduct}
          />
        ) : (
          configState.sections.map((sec) => {
            let sectionEl: ReactNode = null
            switch (sec.type) {
              case "hero":
                sectionEl = (
                  <HeroSection
                    data={sec.data as HeroSectionData}
                    onTitleChange={(text) => onSectionChange(sec.id, { hero_title: text })}
                    onSubtitleChange={(text) => onSectionChange(sec.id, { hero_subtitle: text })}
                    onChangeImage={() => onOpenImageModal(sec)}
                  />
                )
                break
              case "columns":
                sectionEl = (
                  <ColumnsSection
                    data={sec.data as ColumnsSectionData}
                    gridClasses={gridClasses}
                    onTitleChange={(text) => onSectionChange(sec.id, { title: text })}
                    onSubtitleChange={(text) => onSectionChange(sec.id, { subtitle: text })}
                    onColumnTitleChange={(position, text) => onColumnChange(sec.id, position, (c) => ({ ...c, title: text }))}
                    onTextChange={(position, text) => onColumnChange(sec.id, position, (c) => ({ ...c, text }))}
                    onChangeImage={(index) => onOpenImageModal(sec, index)}
                    onSwapColumns={(fromIndex, toIndex) => onSwapColumns(sec.id, fromIndex, toIndex)}
                  />
                )
                break
              case "gallery":
                sectionEl = (
                  <GallerySection
                    data={sec.data as GallerySectionData}
                    onTitleChange={(text) => onSectionChange(sec.id, { title: text })}
                    onSubtitleChange={(text) => onSectionChange(sec.id, { subtitle: text })}
                    onChangeImage={(index) => onOpenImageModal(sec, index)}
                  />
                )
                break
              case "testimonials":
                sectionEl = (
                  <TestimonialsSection
                    data={sec.data as TestimonialsSectionData}
                    onTitleChange={(text) => onSectionChange(sec.id, { title: text })}
                  />
                )
                break
              case "stats":
                sectionEl = (
                  <StatsSection
                    data={sec.data as StatsSectionData}
                    onTitleChange={(text) => onSectionChange(sec.id, { title: text })}
                  />
                )
                break
              case "overlay":
                sectionEl = (
                  <OverlaySection
                    data={sec.data as OverlaySectionData}
                    onTitleChange={(text) => onSectionChange(sec.id, { overlay_title: text })}
                    onSubtitleChange={(text) => onSectionChange(sec.id, { overlay_subtitle: text })}
                    onChangeImage={() => onOpenImageModal(sec)}
                  />
                )
                break
              case "navbar":
                sectionEl = (
                  <NavbarSection
                    data={sec.data as NavbarSectionData}
                    onBrandChange={(text) => onSectionChange(sec.id, { brand_name: text })}
                    onCtaChange={(text) => onSectionChange(sec.id, { cta_text: text })}
                  />
                )
                break
              case "footer":
                sectionEl = (
                  <FooterSection
                    data={sec.data as FooterSectionData}
                    onBrandChange={(text) => onSectionChange(sec.id, { brand_name: text })}
                    onDescriptionChange={(text) => onSectionChange(sec.id, { description: text })}
                    onCopyrightChange={(text) => onSectionChange(sec.id, { copyright: text })}
                  />
                )
                break
              default:
                sectionEl = null
            }
            const isActive = sec.id === activeSectionId
            return (
              <div
                key={sec.id}
                ref={(el) => {
                  sectionRefs.current[sec.id] = el
                }}
                onClick={() => onSelectSection(sec.id)}
                className={`relative transition-all duration-300 ${
                  isActive ? "ring-2 ring-blue-500/50 ring-offset-4 ring-offset-white rounded-2xl shadow-lg shadow-blue-500/5" : ""
                }`}
              >
                {sectionEl}
              </div>
            )
          })
        )}
      </div>
    </ThemeContext.Provider>
  )
}
