'use client'

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, type ReactNode } from "react"

import type { NavbarSectionData, FooterSectionData, HeroType, ContentType, SectionType, Size, ColumnItem, GalleryItem, HeroSectionData, ColumnsSectionData, GallerySectionData, TestimonialsSectionData, StatsSectionData, OverlaySectionData, ProductData, CatalogCategoryData } from "@/components/types"
import { ThemeContext, defaultThemeState, themeFontFamilies, type ThemeState } from "@/components/theme"
import { getImageUrl } from "@/components/imageUrl"

import StockStepper from "@/components/StockStepper"
import OrderChatbot from "@/components/OrderChatbot"
import NavbarSection from "@/components/NavbarSection"
import FooterSection from "@/components/FooterSection"
import OverlaySection from "@/components/OverlaySection"
import HeroSection from "@/components/HeroSection"
import ColumnsSection from "@/components/ColumnsSection"
import DiscoverSection from "@/components/DiscoverSection"
import ProductDetailSection from "@/components/ProductDetailSection"
import GallerySection from "@/components/GallerySection"
import TestimonialsSection from "@/components/TestimonialsSection"
import StatsSection from "@/components/StatsSection"

const API_URL = "http://127.0.0.1:8000/api/config/"
const GENERATE_URL = "http://127.0.0.1:8000/api/generate/"
const UPLOAD_URL = "http://127.0.0.1:8000/api/upload-images/"
const PROJECTS_URL = "http://127.0.0.1:8000/api/projects/"

type SectionData =
  | HeroSectionData
  | ColumnsSectionData
  | GallerySectionData
  | TestimonialsSectionData
  | StatsSectionData
  | OverlaySectionData
  | NavbarSectionData
  | FooterSectionData

type SectionInstance = {
  id: string
  type: SectionType
  data: SectionData
}

type ConfigState = {
  sections: SectionInstance[]
  theme: ThemeState
}

type Toast = { type: "success" | "error"; message: string } | null

type UploadFiles = {
  heroImages: (File | null)[]
  columnImages: Record<number, File | null>
  sliderImages: Record<number, (File | null)[]>
  overlayImages: (File | null)[]
  galleryImages: Record<number, File | null>
}

type ImageModalState = {
  sectionId: string
  sectionType: SectionType
  columnCount?: number
  contentTypes?: Record<number, ContentType>
  targetColumnIndex?: number
  itemCount?: number
  targetItemIndex?: number
} | null

type AiColumn = {
  position?: number
  content_type?: string
  title?: string
  text?: string
  image_keyword?: string
  image_url?: string
}

type AiGalleryItem = {
  title?: string
  image_keyword?: string
  image_url?: string
}

type AiReview = {
  quote?: string
  author?: string
  role?: string
}

type AiMetric = {
  label?: string
  value?: string
}

type AiNavLink = {
  label?: string
  href?: string
}

type AiSection = {
  id?: string
  type?: string
  layout_style?: string
  title?: string
  subtitle?: string
  cta_text?: string
  image_keyword?: string
  image_url?: string
  brand_name?: string
  description?: string
  copyright?: string
  links?: AiNavLink[]
  social_links?: string[]
  columns?: AiColumn[]
  items?: AiGalleryItem[]
  reviews?: AiReview[]
  metrics?: AiMetric[]
}

type AiConfig = {
  theme?: Partial<ThemeState>
  sections?: AiSection[]
  section_order?: string[]
  hero_type?: string
  hero_title?: string
  hero_subtitle?: string
  hero_text_color?: string
  hero_font_family?: string
  hero_font_size?: string
  hero_image_url?: string
  column_count?: number
  columns?: AiColumn[]
  overlay_title?: string
  overlay_subtitle?: string
  overlay_text_color?: string
  overlay_font_family?: string
  overlay_image_url?: string
  catalog?: AiCatalogCategory[]
  original_prompt?: string
}

type AiCatalogProduct = {
  id?: number
  name?: string
  price?: string
  description?: string
  stock?: number
  image_keyword?: string
  image_url?: string
}

type AiCatalogCategory = {
  name?: string
  products?: AiCatalogProduct[]
}

type SavedProjectSummary = {
  id: number
  name: string
  sections_count: number
  categories_count: number
  updated_at: string
}

type ColumnPayload = {
  position?: number
  content_type?: string
  title?: string
  image?: string
  images?: string[]
  text?: string
}

type GalleryItemPayload = {
  title?: string
  image?: string
  images?: string[]
}

type ReviewPayload = {
  quote?: string
  author?: string
  role?: string
}

type MetricPayload = {
  label?: string
  value?: string
}

type NavLinkPayload = {
  label?: string
  href?: string
}

type SectionDataPayload = {
  layout_style?: string
  hero_images?: string[]
  hero_image?: string
  hero_type?: string
  hero_title?: string
  hero_subtitle?: string
  cta_text?: string
  hero_text_color?: string
  hero_font_family?: string
  hero_font_size?: string
  brand_name?: string
  description?: string
  copyright?: string
  links?: NavLinkPayload[]
  social_links?: string[]
  title?: string
  subtitle?: string
  column_count?: number
  columns?: ColumnPayload[]
  items?: GalleryItemPayload[]
  reviews?: ReviewPayload[]
  metrics?: MetricPayload[]
  images?: string[]
  overlay_title?: string
  overlay_subtitle?: string
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

const emptyColumns = (): ColumnItem[] =>
  [1, 2, 3, 4].map((position) => ({
    position,
    content_type: "both",
    title: "",
    image_file: null,
    image_preview_url: "",
    images: [],
    text: "",
  }))

const defaultHeroData = (): HeroSectionData => ({
  layout_style: "centered_bg",
  hero_type: "image",
  hero_title: "",
  hero_subtitle: "",
  cta_text: "En savoir plus",
  hero_text_color: "#ffffff",
  hero_font_family: "sans-serif",
  hero_font_size: "xl",
  hero_image_file: null,
  hero_image_preview_url: "",
  hero_image_preview_urls: [],
})

const defaultColumnsData = (): ColumnsSectionData => ({
  layout_style: "grid_cards",
  title: "Nos services",
  subtitle: "Découvrez ce que nous pouvons faire pour vous",
  column_count: 3,
  columns: emptyColumns(),
})

const defaultGalleryData = (): GallerySectionData => ({
  layout_style: "masonry_grid",
  title: "Galerie",
  subtitle: "Quelques images de nos réalisations",
  items: [1, 2, 3, 4, 5, 6].map((i) => ({ title: `Photo ${i}`, image_file: null, image_preview_url: "" })),
})

const defaultTestimonialsData = (): TestimonialsSectionData => ({
  layout_style: "quote_cards",
  title: "Ils nous font confiance",
  reviews: [
    { quote: "Un service exceptionnel du début à la fin.", author: "Marie D.", role: "Cliente" },
    { quote: "Une équipe à l'écoute et très professionnelle.", author: "Julien R.", role: "Client" },
    { quote: "Je recommande vivement, résultats au-delà de mes attentes.", author: "Sophie M.", role: "Cliente" },
  ],
})

const defaultStatsData = (): StatsSectionData => ({
  layout_style: "metric_grid",
  title: "Nos chiffres clés",
  metrics: [
    { label: "Clients satisfaits", value: "500+" },
    { label: "Projets livrés", value: "1200+" },
    { label: "Années d'expérience", value: "15+" },
    { label: "Support réactif", value: "24/7" },
  ],
})

const defaultOverlayData = (): OverlaySectionData => ({
  layout_style: "full_bg_banner",
  overlay_title: "",
  overlay_subtitle: "",
  cta_text: "Contactez-nous",
  overlay_font_size: "lg",
  overlay_text_color: "#ffffff",
  overlay_font_family: "sans-serif",
  overlay_image_file: null,
  overlay_image_preview_url: "",
  overlay_image_preview_urls: [],
})

const defaultNavbarData = (): NavbarSectionData => ({
  brand_name: "",
  links: [
    { label: "Accueil", href: "#" },
    { label: "Services", href: "#" },
    { label: "Contact", href: "#" },
  ],
  cta_text: "Contact",
})

const defaultFooterData = (): FooterSectionData => ({
  brand_name: "",
  description: "",
  copyright: "© 2026 Tous droits réservés.",
  links: [
    { label: "Accueil", href: "#" },
    { label: "Services", href: "#" },
    { label: "Mentions légales", href: "#" },
  ],
  social_links: ["Instagram", "LinkedIn", "Facebook"],
})

const defaultSectionData = (type: SectionType): SectionData => {
  switch (type) {
    case "hero":
      return defaultHeroData()
    case "columns":
      return defaultColumnsData()
    case "gallery":
      return defaultGalleryData()
    case "testimonials":
      return defaultTestimonialsData()
    case "stats":
      return defaultStatsData()
    case "overlay":
      return defaultOverlayData()
    case "navbar":
      return defaultNavbarData()
    case "footer":
      return defaultFooterData()
  }
}

const defaultConfigState: ConfigState = {
  sections: [
    { id: "hero_1", type: "hero", data: defaultHeroData() },
    { id: "columns_1", type: "columns", data: defaultColumnsData() },
    { id: "overlay_1", type: "overlay", data: defaultOverlayData() },
  ],
  theme: defaultThemeState(),
}

const genSectionId = (type: SectionType): string =>
  `${type}_${
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`

const isPersistedPath = (p: string) => p && !/^(blob:|data:)/.test(p)

const normalizeTheme = (t?: Partial<ThemeState> | null): ThemeState => {
  const font = t?.font_family ?? ""
  const radius = t?.border_radius ?? ""
  return {
    primary_color: t?.primary_color || "#4f46e5",
    secondary_color: t?.secondary_color || "#06b6d4",
    background_color: t?.background_color || "#ffffff",
    font_family: (["serif", "sans-serif", "monospace"] as const).includes(font as ThemeState["font_family"])
      ? (font as ThemeState["font_family"])
      : "sans-serif",
    border_radius: (["none", "sm", "lg", "full"] as const).includes(radius as ThemeState["border_radius"])
      ? (radius as ThemeState["border_radius"])
      : "lg",
  }
}

const heroDataFromAi = (sec: AiSection): HeroSectionData | null => {
  const style = (["centered_bg", "split_50_50", "minimal_text"] as const).includes(sec.layout_style as never)
    ? (sec.layout_style as HeroSectionData["layout_style"])
    : "centered_bg"
  const url = sec.image_url || ""
  return {
    layout_style: style,
    hero_type: url ? "image" : "text",
    hero_title: sec.title || "",
    hero_subtitle: sec.subtitle || "",
    cta_text: sec.cta_text || "En savoir plus",
    hero_text_color: "#ffffff",
    hero_font_family: "sans-serif",
    hero_font_size: "xl",
    hero_image_file: null,
    hero_image_preview_url: url,
    hero_image_preview_urls: url ? [url] : [],
  }
}

const columnsDataFromAi = (sec: AiSection): ColumnsSectionData | null => {
  const style = (["grid_cards", "asymmetric_featured", "alternating_rows"] as const).includes(sec.layout_style as never)
    ? (sec.layout_style as ColumnsSectionData["layout_style"])
    : "grid_cards"
  const cols = emptyColumns()
  ;(sec.columns || []).forEach((col, i) => {
    if (i < 4) {
      const hasImage = Boolean(col.image_url)
      const rawType = col.content_type as ContentType | undefined
      const content_type =
        hasImage && (!rawType || rawType === "text_only")
          ? "both"
          : rawType && ["both", "image_only", "text_only", "slider"].includes(rawType)
            ? rawType
            : "both"
      cols[i] = {
        position: col.position ?? i + 1,
        content_type,
        title: col.title || "",
        image_file: null,
        image_preview_url: col.image_url || "",
        images: hasImage ? [col.image_url as string] : [],
        text: col.text || "",
      }
    }
  })
  const count = style === "asymmetric_featured" ? Math.max(3, Math.min(4, cols.filter((c) => c.title || c.text || c.image_preview_url).length || 3)) : Math.min(Math.max((sec.columns || []).length || 3, 1), 4)
  return { layout_style: style, title: sec.title || "", subtitle: sec.subtitle || "", column_count: count, columns: cols }
}

const galleryDataFromAi = (sec: AiSection): GallerySectionData | null => {
  const style = (["masonry_grid", "row_grid"] as const).includes(sec.layout_style as never)
    ? (sec.layout_style as GallerySectionData["layout_style"])
    : "masonry_grid"
  const items = (sec.items || []).map((it) => ({
    title: it.title || "",
    image_file: null,
    image_preview_url: it.image_url || "",
  }))
  return { layout_style: style, title: sec.title || "", subtitle: sec.subtitle || "", items }
}

const testimonialsDataFromAi = (sec: AiSection): TestimonialsSectionData | null => {
  const style = (["quote_cards", "full_width_quote"] as const).includes(sec.layout_style as never)
    ? (sec.layout_style as TestimonialsSectionData["layout_style"])
    : "quote_cards"
  const reviews = (sec.reviews || []).map((r) => ({
    quote: r.quote || "",
    author: r.author || "",
    role: r.role || "",
  }))
  return { layout_style: style, title: sec.title || "", reviews }
}

const statsDataFromAi = (sec: AiSection): StatsSectionData | null => {
  const style = (["metric_grid", "banner_stats"] as const).includes(sec.layout_style as never)
    ? (sec.layout_style as StatsSectionData["layout_style"])
    : "metric_grid"
  const metrics = (sec.metrics || []).map((m) => ({ label: m.label || "", value: m.value || "" }))
  return { layout_style: style, title: sec.title || "", metrics }
}

const overlayDataFromAi = (sec: AiSection): OverlaySectionData | null => {
  const style = (["full_bg_banner", "split_cta"] as const).includes(sec.layout_style as never)
    ? (sec.layout_style as OverlaySectionData["layout_style"])
    : "full_bg_banner"
  const url = sec.image_url || ""
  return {
    layout_style: style,
    overlay_title: sec.title || "",
    overlay_subtitle: sec.subtitle || "",
    cta_text: sec.cta_text || "Contactez-nous",
    overlay_font_size: "lg",
    overlay_text_color: "#ffffff",
    overlay_font_family: "sans-serif",
    overlay_image_file: null,
    overlay_image_preview_url: url,
    overlay_image_preview_urls: url ? [url] : [],
  }
}

const navbarDataFromAi = (sec: AiSection): NavbarSectionData => {
  const links = (sec.links || []).map((l) => ({ label: l.label || "", href: l.href || "#" }))
  return {
    brand_name: sec.brand_name || sec.title || "",
    links: links.length ? links : defaultNavbarData().links,
    cta_text: sec.cta_text || "Contact",
  }
}

const footerDataFromAi = (sec: AiSection): FooterSectionData => {
  const links = (sec.links || []).map((l) => ({ label: l.label || "", href: l.href || "#" }))
  const social = (sec.social_links || []).map((s) => String(s).trim()).filter(Boolean)
  return {
    brand_name: sec.brand_name || sec.title || "",
    description: sec.description || "",
    copyright: sec.copyright || "© 2026 Tous droits réservés.",
    links: links.length ? links : defaultFooterData().links,
    social_links: social.length ? social : defaultFooterData().social_links,
  }
}

const normalizeAiSection = (raw: AiSection): SectionInstance | null => {
  if (!raw || !["hero", "columns", "gallery", "testimonials", "stats", "overlay", "navbar", "footer"].includes(raw.type || "")) return null
  const type = raw.type as SectionType
  const id = raw.id || `${type}_1`
  let data: SectionData | null = null
  if (type === "hero") data = heroDataFromAi(raw)
  else if (type === "columns") data = columnsDataFromAi(raw)
  else if (type === "gallery") data = galleryDataFromAi(raw)
  else if (type === "testimonials") data = testimonialsDataFromAi(raw)
  else if (type === "stats") data = statsDataFromAi(raw)
  else if (type === "overlay") data = overlayDataFromAi(raw)
  else if (type === "navbar") data = navbarDataFromAi(raw)
  else if (type === "footer") data = footerDataFromAi(raw)
  return data ? { id, type, data } : null
}

const legacySectionsFromAI = (ai: AiConfig): SectionInstance[] => {
  const types = Array.isArray(ai.section_order)
    ? ai.section_order.filter((s) => ["hero", "columns", "overlay"].includes(s))
    : (["hero", "columns", "overlay"] as SectionType[])
  const heroUrl = ai.hero_image_url || ""
  const hero: HeroSectionData = {
    layout_style: "centered_bg",
    hero_type: heroUrl ? "image" : ai.hero_type === "text" ? "text" : "image",
    hero_title: ai.hero_title || "",
    hero_subtitle: ai.hero_subtitle || "",
    cta_text: "En savoir plus",
    hero_text_color: ai.hero_text_color || "#ffffff",
    hero_font_family: ai.hero_font_family || "sans-serif",
    hero_font_size: toSize(ai.hero_font_size, "xl"),
    hero_image_file: null,
    hero_image_preview_url: heroUrl,
    hero_image_preview_urls: heroUrl ? [heroUrl] : [],
  }
  const cols = emptyColumns()
  ;(ai.columns || []).forEach((col, i) => {
    if (i < 4) {
      const hasImage = Boolean(col.image_url)
      const rawType = col.content_type as ContentType | undefined
      cols[i] = {
        position: col.position ?? i + 1,
        content_type:
          hasImage && (!rawType || rawType === "text_only")
            ? "both"
            : rawType && ["both", "image_only", "text_only", "slider"].includes(rawType)
              ? rawType
              : "both",
        title: col.title || "",
        image_file: null,
        image_preview_url: col.image_url || "",
        images: hasImage ? [col.image_url as string] : [],
        text: col.text || "",
      }
    }
  })
  const columns: ColumnsSectionData = {
    layout_style: "grid_cards",
    title: "",
    subtitle: "",
    column_count: Math.min(Math.max(Number(ai.column_count) || 3, 1), 4),
    columns: cols,
  }
  const overlayUrl = ai.overlay_image_url || ""
  const overlay: OverlaySectionData = {
    layout_style: "full_bg_banner",
    overlay_title: ai.overlay_title || "",
    overlay_subtitle: ai.overlay_subtitle || "",
    cta_text: "Contactez-nous",
    overlay_font_size: "lg",
    overlay_text_color: ai.overlay_text_color || "#ffffff",
    overlay_font_family: ai.overlay_font_family || "sans-serif",
    overlay_image_file: null,
    overlay_image_preview_url: overlayUrl,
    overlay_image_preview_urls: overlayUrl ? [overlayUrl] : [],
  }
  const map: Record<string, SectionInstance> = {
    hero: { id: "hero_1", type: "hero", data: hero },
    columns: { id: "columns_1", type: "columns", data: columns },
    overlay: { id: "overlay_1", type: "overlay", data: overlay },
  }
  return types.map((t: string) => map[t]).filter(Boolean)
}

const sectionsFromAI = (ai: AiConfig): { sections: SectionInstance[]; theme: ThemeState } => {
  const theme = normalizeTheme(ai.theme)
  const sections =
    Array.isArray(ai.sections) && ai.sections.length > 0
      ? (ai.sections.map(normalizeAiSection).filter(Boolean) as SectionInstance[])
      : legacySectionsFromAI(ai)
  return { sections: sections.length ? sections : defaultConfigState.sections, theme }
}

const defaultCatalog = (): CatalogCategoryData[] => [
  {
    name: "Chiens",
    products: [
      { name: "Croquettes Bio 5kg", price: "24.99 €", description: "Croquettes riches en protéines pour chiens actifs. Sans céréales et fabriquées en France.", stock: 42, image_url: "" },
      { name: "Laisse en Cuir", price: "22.50 €", description: "Une laisse en cuir véritable, résistante et confortable en main pour toutes les balades.", stock: 15, image_url: "" },
      { name: "Lit Douillet XXL", price: "49.90 €", description: "Un coussin moelleux et lavable pour des nuits douillettes et reposantes.", stock: 8, image_url: "" },
      { name: "Jouet Balle Rebondissante", price: "8.90 €", description: "Une balle durable et rebondissante pour des heures de jeu avec votre compagnon.", stock: 30, image_url: "" },
      { name: "Shampoing Doux Naturel", price: "11.90 €", description: "Un shampoing doux à base d'avoine pour un pelage propre et brillant.", stock: 21, image_url: "" },
      { name: "Harnais Réglable", price: "29.90 €", description: "Un harnais confortable et anti-traction, réglable pour un maintien parfait.", stock: 12, image_url: "" },
    ],
  },
  {
    name: "Chats",
    products: [
      { name: "Arbre à Chat Premium", price: "79.00 €", description: "Un arbre à chat en sisal avec hamac et cachettes, idéal pour grimper et dormir.", stock: 5, image_url: "" },
      { name: "Croquettes Saumon 2kg", price: "19.90 €", description: "Des croquettes au saumon riches en oméga-3 pour un pelage éclatant.", stock: 26, image_url: "" },
      { name: "Fontaine à Eau", price: "34.90 €", description: "Une fontaine à circulation continue qui encourage votre chat à boire.", stock: 9, image_url: "" },
      { name: "Litière Végétale 10L", price: "14.50 €", description: "Une litière naturelle absorbante et sans poussière, agglomérante au quotidien.", stock: 35, image_url: "" },
      { name: "Griffoir en Sisal", price: "18.90 €", description: "Un griffoir vertical robuste pour préserver vos meubles et entretenir ses griffes.", stock: 14, image_url: "" },
      { name: "Jouet Souris Peluche", price: "5.90 €", description: "Des souris en peluche garnies d'herbe à chat pour stimuler l'instinct de chasse.", stock: 50, image_url: "" },
    ],
  },
  {
    name: "Oiseaux",
    products: [
      { name: "Cage Volière Moyenne", price: "89.00 €", description: "Une cage spacieuse et sécurisée, idéale pour perruches et canaris.", stock: 3, image_url: "" },
      { name: "Graines Bio Mélange 1kg", price: "9.90 €", description: "Un mélange de graines certifié bio pour une alimentation variée et équilibrée.", stock: 18, image_url: "" },
      { name: "Perchoir en Bois", price: "6.50 €", description: "Un perchoir naturel en bois pour le confort des pattes et le jeu.", stock: 27, image_url: "" },
      { name: "Miroir avec Clochette", price: "4.90 €", description: "Un miroir ludique avec clochette pour occuper et divertir votre oiseau.", stock: 33, image_url: "" },
      { name: "Abreuvoir Anti-Éclaboussures", price: "7.90 €", description: "Un abreuvoir pratique qui garde l'eau propre et fraîche toute la journée.", stock: 16, image_url: "" },
      { name: "Jouet Clochette", price: "3.90 €", description: "Une clochette colorée et légère, parfaite pour stimuler l'activité.", stock: 44, image_url: "" },
    ],
  },
  {
    name: "Rongeurs",
    products: [
      { name: "Foin de Crau AOP", price: "12.90 €", description: "Un foin de Crau certifié AOP, riche en fibres pour une digestion saine.", stock: 11, image_url: "" },
      { name: "Mangeoire Céramique", price: "8.50 €", description: "Une mangeoire lourde et stable qui ne se renverse pas.", stock: 20, image_url: "" },
      { name: "Roue d'Exercice Silencieuse", price: "15.90 €", description: "Une roue silencieuse pour que votre rongeur se dépense sans bruit la nuit.", stock: 13, image_url: "" },
      { name: "Cage à Barreaux + Tunnel", price: "74.00 €", description: "Une cage modulable avec tunnels et cachettes pour l'épanouissement.", stock: 4, image_url: "" },
      { name: "Friandises aux Fruits", price: "4.50 €", description: "Des bâtonnets gourmands aux fruits pour récompenser votre compagnon.", stock: 38, image_url: "" },
      { name: "Biberon Goutte-à-Goutte", price: "5.90 €", description: "Un biberon anti-fuite à fixer sur la cage pour une hydratation constante.", stock: 29, image_url: "" },
    ],
  },
]

const normalizeCatalog = (catalog?: AiCatalogCategory[] | null): CatalogCategoryData[] => {
  if (!Array.isArray(catalog) || catalog.length === 0) return defaultCatalog()
  const normalized = catalog
    .map((cat) => ({
      name: cat.name || "",
      products: Array.isArray(cat.products)
          ? cat.products
            .map((p) => ({
              id: typeof p.id === "number" ? p.id : undefined,
              name: p.name || "",
              price: p.price || "",
              description: p.description || "",
              stock: typeof p.stock === "number" ? p.stock : parseInt(String(p.stock ?? ""), 10) || 0,
              image_url: p.image_url || "",
            }))
            .filter((p) => p.name)
        : [],
    }))
    .filter((c) => c.name)
  return normalized.length ? normalized : defaultCatalog()
}

const normalizeSection = (sec: SectionPayload): SectionInstance | null => {
  if (!sec || !["hero", "columns", "gallery", "testimonials", "stats", "overlay", "navbar", "footer"].includes(sec.type || "")) return null
  const type = sec.type as SectionType
  const id = sec.id || `${type}_1`
  const raw = sec.data || {}

  if (type === "navbar") {
    const links = (raw.links || []).map((l: NavLinkPayload) => ({ label: l.label || "", href: l.href || "#" }))
    return {
      id,
      type,
      data: {
        brand_name: raw.brand_name || "",
        links: links.length ? links : defaultNavbarData().links,
        cta_text: raw.cta_text || "Contact",
      },
    }
  }

  if (type === "footer") {
    const links = (raw.links || []).map((l: NavLinkPayload) => ({ label: l.label || "", href: l.href || "#" }))
    const social = Array.isArray(raw.social_links) ? raw.social_links.map((s) => String(s).trim()).filter(Boolean) : []
    return {
      id,
      type,
      data: {
        brand_name: raw.brand_name || "",
        description: raw.description || "",
        copyright: raw.copyright || "© 2026 Tous droits réservés.",
        links: links.length ? links : defaultFooterData().links,
        social_links: social.length ? social : defaultFooterData().social_links,
      },
    }
  }

  if (type === "hero") {
    const style = (["centered_bg", "split_50_50", "minimal_text"] as const).includes(raw.layout_style as never)
      ? (raw.layout_style as HeroSectionData["layout_style"])
      : "centered_bg"
    const urls = Array.isArray(raw.hero_images) ? raw.hero_images.filter(isPersistedPath) : []
    const single = raw.hero_image && isPersistedPath(raw.hero_image) ? [raw.hero_image] : []
    const images = urls.length ? urls : single
    const data: HeroSectionData = {
      layout_style: style,
      hero_type: images.length ? "image" : raw.hero_type === "text" ? "text" : "image",
      hero_title: raw.hero_title || "",
      hero_subtitle: raw.hero_subtitle || "",
      cta_text: raw.cta_text || "En savoir plus",
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
    const style = (["grid_cards", "asymmetric_featured", "alternating_rows"] as const).includes(raw.layout_style as never)
      ? (raw.layout_style as ColumnsSectionData["layout_style"])
      : "grid_cards"
    const column_count = Math.min(Math.max(Number(raw.column_count) || 3, 1), 4)
    const cols = emptyColumns()
    ;(raw.columns || []).forEach((col: ColumnPayload) => {
      const idx = Number(col.position) - 1
      if (idx >= 0 && idx < 4) {
        const imgs = Array.isArray(col.images) ? col.images.filter(isPersistedPath) : []
        const single = col.image && isPersistedPath(col.image) ? [col.image] : []
        cols[idx] = {
          position: Number(col.position),
          content_type: ["both", "image_only", "text_only", "slider"].includes(col.content_type || "")
            ? (col.content_type as ContentType)
            : "both",
          title: col.title || "",
          image_file: null,
          image_preview_url: single[0] || imgs[0] || "",
          images: imgs.length ? imgs : single,
          text: col.text || "",
        }
      }
    })
    return { id, type, data: { layout_style: style, title: raw.title || "", subtitle: raw.subtitle || "", column_count, columns: cols } }
  }

  if (type === "gallery") {
    const style = (["masonry_grid", "row_grid"] as const).includes(raw.layout_style as never)
      ? (raw.layout_style as GallerySectionData["layout_style"])
      : "masonry_grid"
    const items = (raw.items || []).map((it: GalleryItemPayload) => {
      const imgs = Array.isArray(it.images) ? it.images.filter(isPersistedPath) : []
      const single = it.image && isPersistedPath(it.image) ? [it.image] : []
      return {
        title: it.title || "",
        image_file: null,
        image_preview_url: single[0] || imgs[0] || "",
      }
    })
    return { id, type, data: { layout_style: style, title: raw.title || "", subtitle: raw.subtitle || "", items } }
  }

  if (type === "testimonials") {
    const style = (["quote_cards", "full_width_quote"] as const).includes(raw.layout_style as never)
      ? (raw.layout_style as TestimonialsSectionData["layout_style"])
      : "quote_cards"
    const reviews = (raw.reviews || []).map((r: ReviewPayload) => ({
      quote: r.quote || "",
      author: r.author || "",
      role: r.role || "",
    }))
    return { id, type, data: { layout_style: style, title: raw.title || "", reviews } }
  }

  if (type === "stats") {
    const style = (["metric_grid", "banner_stats"] as const).includes(raw.layout_style as never)
      ? (raw.layout_style as StatsSectionData["layout_style"])
      : "metric_grid"
    const metrics = (raw.metrics || []).map((m: MetricPayload) => ({ label: m.label || "", value: m.value || "" }))
    return { id, type, data: { layout_style: style, title: raw.title || "", metrics } }
  }

  const style = (["full_bg_banner", "split_cta"] as const).includes(raw.layout_style as never)
    ? (raw.layout_style as OverlaySectionData["layout_style"])
    : "full_bg_banner"
  const images = Array.isArray(raw.images) ? raw.images.filter(isPersistedPath) : []
  const data: OverlaySectionData = {
    layout_style: style,
    overlay_title: raw.overlay_title || raw.title || "",
    overlay_subtitle: raw.overlay_subtitle || raw.subtitle || "",
    cta_text: raw.cta_text || "Contactez-nous",
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
  const clone = JSON.parse(JSON.stringify(data)) as SectionData
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
  } else if ("items" in clone) {
    clone.items = (clone.items || []).map((it: GalleryItem) => ({ ...it, image_file: null }))
  } else if ("overlay_title" in clone) {
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

  const serializeSections = (sections: SectionInstance[]): SectionPayload[] =>
    sections.map((sec) => {
      const data = JSON.parse(JSON.stringify(sec.data)) as Record<string, unknown>
      if (sec.type === "hero") {
        data.hero_images = (data.hero_image_preview_urls as string[] | undefined || []).filter(isPersistedPath)
        delete data.hero_image_file
        delete data.hero_image_preview_url
        delete data.hero_image_preview_urls
      } else if (sec.type === "overlay") {
        data.images = (data.overlay_image_preview_urls as string[] | undefined || []).filter(isPersistedPath)
        delete data.overlay_image_file
        delete data.overlay_image_preview_url
        delete data.overlay_image_preview_urls
      } else if (sec.type === "columns") {
        data.columns = (data.columns as ColumnItem[]).map((c) => ({
          position: c.position,
          title: c.title,
          content_type: c.content_type,
          image: c.image_preview_url && isPersistedPath(c.image_preview_url) ? c.image_preview_url : "",
          images: (c.images || []).filter(isPersistedPath),
          text: c.text,
        }))
      } else if (sec.type === "gallery") {
        data.items = (data.items as GalleryItem[]).map((it) => ({
          title: it.title,
          image: it.image_preview_url && isPersistedPath(it.image_preview_url) ? it.image_preview_url : "",
        }))
      }
      return { id: sec.id, type: sec.type, data }
    })

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Enregistrer le projet</h2>
              <p className="text-sm text-slate-500 mt-1">Votre projet sera enregistré dans la base de données sous ce nom.</p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">Entrez le nom de votre projet :</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !saving) void saveProject(projectName.trim())
                }}
                placeholder="Mon Animalerie"
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveProject(projectName.trim())}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </button>
            </div>
          </div>
        </div>
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

const formatProjectDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  } catch {
    return iso
  }
}

function SavedProjectsModal({
  projects,
  loading,
  onClose,
  onRefresh,
  onLoad,
  onDelete,
}: {
  projects: SavedProjectSummary[]
  loading: boolean
  onClose: () => void
  onRefresh: () => void
  onLoad: (name: string) => void
  onDelete: (name: string) => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">📁 Mes Projets</h2>
            <p className="text-sm text-slate-500 mt-1">Chargez ou supprimez vos projets enregistrés.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {projects.length > 0 ? `${projects.length} projet${projects.length > 1 ? "s" : ""} enregistré${projects.length > 1 ? "s" : ""}` : "Aucun projet enregistré"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Actualiser
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && !projects.length ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Chargement...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📂</div>
              <p className="text-slate-500 font-medium">Aucun projet enregistré pour le moment</p>
              <p className="text-sm text-slate-400 mt-1">Cliquez sur &quot;Enregistrer le projet&quot; pour en créer un.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug break-words">{p.name}</h3>
                    <span className="shrink-0 text-[11px] text-slate-400 font-medium bg-white border border-slate-200 rounded-full px-2 py-0.5">
                      {formatProjectDate(p.updated_at)}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                      {p.sections_count} section{p.sections_count > 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                      </svg>
                      {p.categories_count} catégorie{p.categories_count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => onLoad(p.name)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                      </svg>
                      Ouvrir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleting(p.name)
                        void onDelete(p.name)
                      }}
                      disabled={deleting === p.name}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {deleting === p.name ? (
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      )}
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SECTION_LABELS: Record<SectionType, { name: string; hint: string; emoji: string }> = {
  navbar: { name: "Barre de navigation", hint: "Top navigation bar with links and CTA", emoji: "🧭" },
  hero: { name: "Hero Banner", hint: "Header banner with CTA", emoji: "🏞️" },
  columns: { name: "Feature Columns", hint: "Grid or asymmetric service cards", emoji: "🎴" },
  gallery: { name: "Photo Gallery", hint: "Grid showcase of images", emoji: "🖼️" },
  testimonials: { name: "Testimonials", hint: "Client reviews and feedback", emoji: "💬" },
  stats: { name: "Stats & Metrics", hint: "Key figures and statistics", emoji: "📊" },
  overlay: { name: "Call to Action Overlay", hint: "Full-width banner", emoji: "📣" },
  footer: { name: "Pied de page", hint: "Footer with links and social icons", emoji: "🏁" },
}

function ConfigPanel({
  configState,
  saving,
  prompt,
  regenerating,
  activeSectionId,
  onSelectSection,
  onPromptChange,
  onRegenerate,
  onSectionChange,
  onColumnChange,
  onOpenImageModal,
  onAddSection,
  onDuplicateSection,
  onRemoveSection,
  onReorderSections,
  onSave,
}: {
  configState: ConfigState
  saving: boolean
  prompt: string
  regenerating: boolean
  activeSectionId: string | null
  onSelectSection: (id: string | null) => void
  onPromptChange: (value: string) => void
  onRegenerate: () => void
  onSectionChange: (id: string, patch: Partial<SectionData>) => void
  onColumnChange: (id: string, position: number, updater: (col: ColumnItem) => ColumnItem) => void
  onOpenImageModal: (section: SectionInstance, targetIndex?: number) => void
  onAddSection: (type: SectionType) => void
  onDuplicateSection: (id: string) => void
  onRemoveSection: (id: string) => void
  onReorderSections: (fromIndex: number, toIndex: number) => void
  onSave: () => void
}) {
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null)
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null)

  const clearSectionDragState = () => {
    setDraggedSectionIndex(null)
    setDragOverSectionIndex(null)
  }

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const selectSection = (sectionId: string) => {
    onSelectSection(sectionId)
    setCollapsedSections((prev) => (prev[sectionId] ? { ...prev, [sectionId]: false } : prev))
  }

  return (
    <div className="relative h-full">
      <div className="p-6 pb-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Page Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Composez vos sections : bannières, colonnes, galeries, avis, statistiques et CTA.</p>
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
            const isCollapsed = collapsedSections[sec.id] ?? false
            return (
              <section
                key={sec.id}
                draggable
                onDragStart={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest("input, textarea, select, button, [draggable='false']")) {
                    e.preventDefault()
                    return
                  }
                  setDraggedSectionIndex(index)
                  e.dataTransfer.effectAllowed = "move"
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                  if (dragOverSectionIndex !== index) setDragOverSectionIndex(index)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverSectionIndex === index) setDragOverSectionIndex(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedSectionIndex !== null && draggedSectionIndex !== index) {
                    onReorderSections(draggedSectionIndex, index)
                  }
                  clearSectionDragState()
                }}
                onDragEnd={clearSectionDragState}
                className={`bg-white rounded-xl shadow-sm border border-slate-200 transition-opacity duration-200 ${
                  draggedSectionIndex === index ? "opacity-50" : ""
                } ${dragOverSectionIndex === index ? "ring-2 ring-blue-500 ring-offset-2 rounded-xl" : ""}`}
              >
                <div
                  className={`flex items-center gap-3 p-6 pb-0 cursor-pointer select-none ${sec.id === activeSectionId ? "rounded-t-xl bg-indigo-50/50" : ""}`}
                  onClick={() => {
                    onSelectSection(sec.id)
                    toggleCollapse(sec.id)
                  }}
                  aria-expanded={!isCollapsed}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectSection(sec.id)
                      toggleCollapse(sec.id)
                    }
                  }}
                >
                  <div
                    className="w-6 h-8 flex items-center justify-center text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing flex-shrink-0 transition"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.4" />
                      <circle cx="15" cy="5" r="1.4" />
                      <circle cx="9" cy="12" r="1.4" />
                      <circle cx="15" cy="12" r="1.4" />
                      <circle cx="9" cy="19" r="1.4" />
                      <circle cx="15" cy="19" r="1.4" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">{label.emoji} {label.name}</h2>
                    {!isCollapsed && <p className="text-sm text-slate-500 truncate">{label.hint}</p>}
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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

                {!isCollapsed && (
                  <div className="p-6" onFocusCapture={() => selectSection(sec.id)}>
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
                        onOpenImageModal={(columnIndex) => onOpenImageModal(sec, columnIndex)}
                      />
                    )}
                    {sec.type === "gallery" && (
                      <GalleryEditor
                        data={sec.data as GallerySectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                        onOpenImageModal={(itemIndex) => onOpenImageModal(sec, itemIndex)}
                      />
                    )}
                    {sec.type === "testimonials" && (
                      <TestimonialsEditor
                        data={sec.data as TestimonialsSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                    {sec.type === "stats" && (
                      <StatsEditor
                        data={sec.data as StatsSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                    {sec.type === "overlay" && (
                      <OverlayEditor
                        data={sec.data as OverlaySectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                        onOpenImageModal={() => onOpenImageModal(sec)}
                      />
                    )}
                    {sec.type === "navbar" && (
                      <NavbarEditor
                        data={sec.data as NavbarSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                    {sec.type === "footer" && (
                      <FooterEditor
                        data={sec.data as FooterSectionData}
                        onChange={(patch) => onSectionChange(sec.id, patch)}
                      />
                    )}
                  </div>
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
              <p className="text-sm text-slate-500 mt-1">
                La barre de navigation est insérée en haut, le pied de page en bas de votre page.
              </p>
            </div>
            <div className="px-6 py-5 space-y-2">
              {(["navbar", "hero", "columns", "gallery", "testimonials", "stats", "overlay", "footer"] as SectionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAddSection(type)
                    setAddSectionOpen(false)
                  }}
                  className="w-full flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-indigo-400 hover:bg-indigo-50/30 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-lg">
                    {SECTION_LABELS[type].emoji}
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

function CatalogManagerPanel({
  catalog,
  selectedProduct,
  onCategoryNameChange,
  onProductChange,
  onSelectProduct,
  onViewProductDetail,
}: {
  catalog: CatalogCategoryData[]
  selectedProduct: { categoryIndex: number; productIndex: number } | null
  onCategoryNameChange: (categoryIndex: number, name: string) => void
  onProductChange: (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) => void
  onSelectProduct: (categoryIndex: number, productIndex: number) => void
  onViewProductDetail: (categoryIndex: number, productIndex: number) => void
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const totalProducts = catalog.reduce((sum, cat) => sum + cat.products.length, 0)
  const isExpanded = (i: number) => expanded[i] ?? true

  const toggle = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !(prev[i] ?? true) }))

  const isSelected = (ci: number, pi: number): boolean =>
    selectedProduct !== null && selectedProduct.categoryIndex === ci && selectedProduct.productIndex === pi

  return (
    <div className="relative h-full">
      <div className="p-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">🛍️ Structure du Catalogue</h1>
          <p className="text-sm text-slate-500 mt-1">
            {catalog.length} Catégories · {totalProducts} produits — cliquez sur un produit pour le repérer dans l&apos;aperçu.
          </p>
        </div>

        <div className="space-y-4">
          {catalog.map((cat, ci) => {
            const open = isExpanded(ci)
            const catSelected = selectedProduct?.categoryIndex === ci
            return (
              <section
                key={`cat-${ci}`}
                className={`bg-white rounded-xl shadow-sm border transition ${
                  catSelected ? "border-blue-400 ring-1 ring-blue-400/40" : "border-slate-200"
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(ci)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggle(ci)
                    }
                  }}
                  className="flex items-center gap-3 p-4 cursor-pointer select-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold shrink-0">
                    {ci + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => onCategoryNameChange(ci, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Nom de la catégorie"
                      aria-label={`Nom de la catégorie ${ci + 1}`}
                      className="w-full bg-transparent text-sm font-semibold text-slate-800 border border-transparent hover:border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                    />
                    <p className="text-xs text-slate-400 px-2">{cat.products.length} produits</p>
                  </div>
                  <span className="text-xs font-semibold rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 shrink-0">
                    {cat.products.length}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>

                {open && (
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    {cat.products.map((product, pi) => {
                      const selected = isSelected(ci, pi)
                      return (
                        <div
                          key={`prod-${ci}-${pi}`}
                          onClick={() => onSelectProduct(ci, pi)}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition cursor-pointer ${
                            selected
                              ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/40"
                              : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-white"
                          }`}
                        >
                          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            {product.image_url ? (
                              <img src={getImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => onProductChange(ci, pi, { name: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Nom du produit"
                              aria-label={`Nom du produit ${pi + 1}`}
                              className="w-full bg-transparent text-sm font-medium text-slate-800 border border-transparent hover:border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={product.price}
                                onChange={(e) => onProductChange(ci, pi, { price: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Prix"
                                aria-label={`Prix du produit ${pi + 1}`}
                                className="w-20 bg-transparent text-xs font-semibold text-indigo-600 border border-transparent hover:border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                              />
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  (product.stock ?? 0) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {(product.stock ?? 0) > 0 ? "En stock" : "Rupture"}
                              </span>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-end gap-1.5 shrink-0">
                            <StockStepper value={product.stock ?? 0} onChange={(stock) => onProductChange(ci, pi, { stock })} />
                            <button
                              type="button"
                              onClick={() => onViewProductDetail(ci, pi)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Fiche
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProductEditorPanel({
  catalog,
  activeProductInfo,
  onProductChange,
}: {
  catalog: CatalogCategoryData[]
  activeProductInfo: { categoryIndex: number; productIndex: number } | null
  onProductChange: (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) => void
}) {
  const catIndex = activeProductInfo ? Math.min(Math.max(activeProductInfo.categoryIndex, 0), Math.max(catalog.length - 1, 0)) : 0
  const prodIndex = activeProductInfo?.productIndex ?? 0
  const category = catalog[catIndex]
  const product = activeProductInfo ? category?.products?.[prodIndex] : undefined
  const stock = product ? (product.stock ?? 0) : 0

  return (
    <div className="relative h-full">
      <div className="p-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Éditeur Fiche Produit</h1>
          <p className="text-sm text-slate-500 mt-1">Modifiez les informations de la fiche produit sélectionnée.</p>
        </div>

        {!product ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <div className="text-4xl mb-3">
              <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">Aucun produit sélectionné.</p>
            <p className="text-xs text-slate-400 mt-1">Sélectionnez un produit dans la boutique pour l&apos;éditer.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Catégorie</p>
              <p className="text-sm font-semibold text-slate-800">{category?.name || "Sans catégorie"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit</label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => onProductChange(catIndex, prodIndex, { name: e.target.value })}
                placeholder="Nom du produit"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prix</label>
              <input
                type="text"
                value={product.price}
                onChange={(e) => onProductChange(catIndex, prodIndex, { price: e.target.value })}
                placeholder="Ex. 24.99 €"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
              <StockStepper value={stock} onChange={(stock) => onProductChange(catIndex, prodIndex, { stock })} size="md" />
              <p className="text-xs text-slate-400 mt-1.5">Incrémentez ou décrémentez directement le stock disponible.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={product.description || ""}
                onChange={(e) => onProductChange(catIndex, prodIndex, { description: e.target.value })}
                rows={6}
                placeholder="Ajoutez une description engageante pour ce produit..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition"
              />
            </div>

            <div className={`rounded-xl border p-4 text-center ${stock > 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              {stock > 0 ? (
                <p className="text-sm font-semibold text-emerald-700">
                  En stock : {stock} exemplaire{stock > 1 ? "s" : ""} disponibles
                </p>
              ) : (
                <p className="text-sm font-semibold text-red-700">Rupture de stock</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LayoutStyleSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              value === opt.value
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
        />
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
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as HeroSectionData["layout_style"] })}
        options={[
          { value: "centered_bg", label: "Centered BG" },
          { value: "split_50_50", label: "Split 50/50" },
          { value: "minimal_text", label: "Minimal Text" },
        ]}
      />

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
        <TextField label="CTA Text" value={data.cta_text} onChange={(v) => onChange({ cta_text: v })} placeholder="En savoir plus" />
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
          <TextField label="Hero Title" value={data.hero_title} onChange={(v) => onChange({ hero_title: v })} placeholder="Enter hero title..." />
          <TextField label="Hero Subtitle" value={data.hero_subtitle} onChange={(v) => onChange({ hero_subtitle: v })} placeholder="Enter hero subtitle..." />
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
  onOpenImageModal: (columnIndex: number) => void
}) {
  const columnInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as ColumnsSectionData["layout_style"] })}
        options={[
          { value: "grid_cards", label: "Grid Cards" },
          { value: "asymmetric_featured", label: "Asymmetric" },
          { value: "alternating_rows", label: "Alternating" },
        ]}
      />
      <div className="mb-6 space-y-4">
        <TextField label="Section Title" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Nos services" />
        <TextField label="Section Subtitle" value={data.subtitle} onChange={(v) => onChange({ subtitle: v })} placeholder="Découvrez ce que nous proposons" multiline />
      </div>

      {data.layout_style === "grid_cards" && (
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
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.columns.slice(0, data.column_count).map((col, index) => (
          <div key={col.position} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-200 hover:shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Column {col.position}</h3>
              <span className="text-xs text-slate-400 font-mono">0{col.position}</span>
            </div>

            <div className="mb-3">
              <TextField label="Title" value={col.title} onChange={(v) => onColumnChange(col.position, (c) => ({ ...c, title: v }))} placeholder="Titre de la colonne" />
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
                    onClick={() => onOpenImageModal(index)}
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

function GalleryEditor({
  data,
  onChange,
  onOpenImageModal,
}: {
  data: GallerySectionData
  onChange: (patch: Partial<GallerySectionData>) => void
  onOpenImageModal: (itemIndex: number) => void
}) {
  const itemInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  return (
    <div>
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as GallerySectionData["layout_style"] })}
        options={[
          { value: "masonry_grid", label: "Masonry Grid" },
          { value: "row_grid", label: "Row Grid" },
        ]}
      />
      <div className="mb-6 space-y-4">
        <TextField label="Section Title" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Galerie" />
        <TextField label="Section Subtitle" value={data.subtitle} onChange={(v) => onChange({ subtitle: v })} placeholder="Quelques images de nos réalisations" multiline />
      </div>

      <div className="space-y-3">
        {data.items.map((item, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Photo {i + 1}</h3>
              <button
                type="button"
                onClick={() => onChange({ items: data.items.filter((_, j) => j !== i) })}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Remove
              </button>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="relative w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition flex-shrink-0"
                onClick={() => itemInputRefs.current[i]?.click()}
              >
                <input
                  ref={(el) => { itemInputRefs.current[i] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const items = data.items.map((it, j) =>
                        j === i ? { ...it, image_file: file, image_preview_url: URL.createObjectURL(file) } : it
                      )
                      onChange({ items })
                    }
                  }}
                />
                {item.image_preview_url ? (
                  <img src={getImageUrl(item.image_preview_url)} alt={`Gallery ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const items = data.items.map((it, j) => (j === i ? { ...it, title: e.target.value } : it))
                    onChange({ items })
                  }}
                  placeholder="Photo title..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => onOpenImageModal(i)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Change image
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ items: [...data.items, { title: "", image_file: null, image_preview_url: "" }] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Photo
        </button>
      </div>
    </div>
  )
}

function TestimonialsEditor({
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

function StatsEditor({
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

function NavbarEditor({
  data,
  onChange,
}: {
  data: NavbarSectionData
  onChange: (patch: Partial<NavbarSectionData>) => void
}) {
  return (
    <div>
      <div className="space-y-4 mb-6">
        <TextField label="Brand Name" value={data.brand_name} onChange={(v) => onChange({ brand_name: v })} placeholder="Votre Marque" />
        <TextField label="CTA Text" value={data.cta_text} onChange={(v) => onChange({ cta_text: v })} placeholder="Contact" />
      </div>
      <div className="space-y-4">
        {data.links.map((link, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Lien {i + 1}</h3>
              <button
                type="button"
                onClick={() => onChange({ links: data.links.filter((_, j) => j !== i) })}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Label" value={link.label} onChange={(v) => onChange({ links: data.links.map((it, j) => (j === i ? { ...it, label: v } : it)) })} placeholder="Accueil" />
              <TextField label="Href" value={link.href} onChange={(v) => onChange({ links: data.links.map((it, j) => (j === i ? { ...it, href: v } : it)) })} placeholder="#" />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ links: [...data.links, { label: "", href: "#" }] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Link
        </button>
      </div>
    </div>
  )
}

function FooterEditor({
  data,
  onChange,
}: {
  data: FooterSectionData
  onChange: (patch: Partial<FooterSectionData>) => void
}) {
  return (
    <div>
      <div className="space-y-4 mb-6">
        <TextField label="Brand Name" value={data.brand_name} onChange={(v) => onChange({ brand_name: v })} placeholder="Votre Marque" />
        <TextField label="Description" value={data.description} onChange={(v) => onChange({ description: v })} placeholder="Courte description du site..." multiline />
        <TextField label="Copyright" value={data.copyright} onChange={(v) => onChange({ copyright: v })} placeholder="© 2026 Tous droits réservés." />
      </div>
      <div className="space-y-4">
        {data.links.map((link, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Lien {i + 1}</h3>
              <button
                type="button"
                onClick={() => onChange({ links: data.links.filter((_, j) => j !== i) })}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Label" value={link.label} onChange={(v) => onChange({ links: data.links.map((it, j) => (j === i ? { ...it, label: v } : it)) })} placeholder="Accueil" />
              <TextField label="Href" value={link.href} onChange={(v) => onChange({ links: data.links.map((it, j) => (j === i ? { ...it, href: v } : it)) })} placeholder="#" />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ links: [...data.links, { label: "", href: "#" }] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Link
        </button>
      </div>
      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Réseaux sociaux</label>
        {data.social_links.map((social, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={social}
              onChange={(e) => onChange({ social_links: data.social_links.map((it, j) => (j === i ? e.target.value : it)) })}
              placeholder="Instagram"
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
            <button
              type="button"
              onClick={() => onChange({ social_links: data.social_links.filter((_, j) => j !== i) })}
              className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ social_links: [...data.social_links, ""] })}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-indigo-600 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          + Add Social Link
        </button>
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
      <LayoutStyleSelect
        label="Layout"
        value={data.layout_style}
        onChange={(v) => onChange({ layout_style: v as OverlaySectionData["layout_style"] })}
        options={[
          { value: "full_bg_banner", label: "Full BG Banner" },
          { value: "split_cta", label: "Split CTA" },
        ]}
      />
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
        Choose background image
      </button>

      <div className="space-y-4 mb-6">
        <TextField label="Title" value={data.overlay_title} onChange={(v) => onChange({ overlay_title: v })} placeholder="Enter overlay title..." />
        <TextField label="Subtitle" value={data.overlay_subtitle} onChange={(v) => onChange({ overlay_subtitle: v })} placeholder="Enter overlay subtitle..." multiline />
        <TextField label="CTA Text" value={data.cta_text} onChange={(v) => onChange({ cta_text: v })} placeholder="Contactez-nous" />
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

function LivePreview({
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
                ✨ Design généré par l&apos;IA — Cliquez sur &apos;Save & Publish&apos; pour enregistrer
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

function ImageUploadModal({
  sectionId,
  sectionType,
  columnCount,
  contentTypes,
  targetColumnIndex,
  itemCount,
  targetItemIndex,
  onSkip,
  onApply,
}: {
  sectionId: string
  sectionType: SectionType
  columnCount: number
  contentTypes?: Record<number, ContentType>
  targetColumnIndex?: number
  itemCount?: number
  targetItemIndex?: number
  onSkip: () => void
  onApply: (files: UploadFiles, sectionId: string, sectionType: SectionType) => Promise<boolean>
}) {
  const [heroImages, setHeroImages] = useState<(File | null)[]>([null, null, null])
  const [columnImages, setColumnImages] = useState<Record<number, File | null>>({})
  const [sliderImages, setSliderImages] = useState<Record<number, (File | null)[]>>({})
  const [overlayImages, setOverlayImages] = useState<(File | null)[]>([null])
  const [galleryImages, setGalleryImages] = useState<Record<number, File | null>>({})
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
  const setGallery = (index: number, file: File | null) =>
    setGalleryImages((prev) => ({ ...prev, [index]: file }))

  const handleApply = async () => {
    setUploading(true)
    const ok = await onApply({ heroImages, columnImages, sliderImages, overlayImages, galleryImages }, sectionId, sectionType)
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

  let title = "Section"
  if (sectionType === "hero") title = "Hero Banner"
  else if (sectionType === "columns") title = targetColumnIndex !== undefined ? `Colonne ${targetColumnIndex + 1}` : "Feature Columns"
  else if (sectionType === "gallery") title = targetItemIndex !== undefined ? `Photo ${targetItemIndex + 1}` : "Photo Gallery"
  else if (sectionType === "testimonials") title = "Testimonials"
  else if (sectionType === "stats") title = "Stats & Metrics"
  else title = "Background Overlay"

  const columnPositions =
    targetColumnIndex !== undefined
      ? [targetColumnIndex + 1]
      : Array.from({ length: columnCount }, (_, i) => i + 1)

  const galleryIndices =
    targetItemIndex !== undefined
      ? [targetItemIndex]
      : Array.from({ length: itemCount ?? 1 }, (_, i) => i)

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
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                {targetColumnIndex !== undefined
                  ? `Colonne ${targetColumnIndex + 1}`
                  : <>Columns <span className="text-slate-400 font-normal">({columnCount} image{columnCount > 1 ? "s" : ""})</span></>}
              </h3>
              <div className="space-y-3">
                {columnPositions.map((position) => {
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

          {sectionType === "gallery" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                {targetItemIndex !== undefined
                  ? `Photo ${targetItemIndex + 1}`
                  : <>Gallery <span className="text-slate-400 font-normal">({galleryIndices.length} photo{galleryIndices.length > 1 ? "s" : ""})</span></>}
              </h3>
              <div className="space-y-2">
                {galleryIndices.map((i) =>
                  uploadSlot(`gallery-${i}`, `Photo ${i + 1}`, galleryImages[i] ?? null, (f) => setGallery(i, f))
                )}
              </div>
            </div>
          )}

          {sectionType === "overlay" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Background Overlay Section <span className="text-slate-400 font-normal">(1 image)</span></h3>
              <div className="space-y-2">
                {overlayImages.map((file, i) => uploadSlot(`overlay-${i}`, "Background image", file, (f) => setOverlay(i, f)))}
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