import type {
  HeroSectionData,
  ColumnsSectionData,
  GallerySectionData,
  TestimonialsSectionData,
  StatsSectionData,
  OverlaySectionData,
  NavbarSectionData,
  FooterSectionData,
  SectionType,
  ContentType,
} from "@/components/types"
import type { ThemeState } from "@/components/theme"

// ── Core builder types ────────────────────────────────────────────────────────

export type SectionData =
  | HeroSectionData
  | ColumnsSectionData
  | GallerySectionData
  | TestimonialsSectionData
  | StatsSectionData
  | OverlaySectionData
  | NavbarSectionData
  | FooterSectionData

export type SectionInstance = {
  id: string
  type: SectionType
  data: SectionData
}

export type ConfigState = {
  sections: SectionInstance[]
  theme: ThemeState
}

export type Toast = { type: "success" | "error"; message: string } | null

export type UploadFiles = {
  heroImages: (File | null)[]
  columnImages: Record<number, File | null>
  sliderImages: Record<number, (File | null)[]>
  overlayImages: (File | null)[]
  galleryImages: Record<number, File | null>
}

export type ImageModalState = {
  sectionId: string
  sectionType: SectionType
  columnCount?: number
  contentTypes?: Record<number, ContentType>
  targetColumnIndex?: number
  itemCount?: number
  targetItemIndex?: number
} | null

export type SavedProjectSummary = {
  id: number
  name: string
  sections_count: number
  categories_count: number
  updated_at: string
}

// ── AI input shapes ───────────────────────────────────────────────────────────

export type AiColumn = {
  position?: number
  content_type?: string
  title?: string
  text?: string
  image_keyword?: string
  image_url?: string
}

export type AiGalleryItem = {
  title?: string
  image_keyword?: string
  image_url?: string
}

export type AiReview = {
  quote?: string
  author?: string
  role?: string
}

export type AiMetric = {
  label?: string
  value?: string
}

export type AiNavLink = {
  label?: string
  href?: string
}

export type AiSection = {
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

export type AiCatalogProduct = {
  id?: number
  name?: string
  price?: string
  description?: string
  stock?: number
  image_keyword?: string
  image_url?: string
}

export type AiCatalogCategory = {
  name?: string
  products?: AiCatalogProduct[]
}

export type AiConfig = {
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
  pending_catalog?: boolean
}

// ── Serialization payload shapes ─────────────────────────────────────────────

export type ColumnPayload = {
  position?: number
  content_type?: string
  title?: string
  image?: string
  images?: string[]
  text?: string
}

export type GalleryItemPayload = {
  title?: string
  image?: string
  images?: string[]
}

export type ReviewPayload = {
  quote?: string
  author?: string
  role?: string
}

export type MetricPayload = {
  label?: string
  value?: string
}

export type NavLinkPayload = {
  label?: string
  href?: string
}

export type SectionDataPayload = {
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

export type SectionPayload = {
  id?: string
  type?: string
  data?: SectionDataPayload
}
