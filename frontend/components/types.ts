export type NavLink = {
  label: string
  href: string
}

export type NavbarSectionData = {
  brand_name: string
  links: NavLink[]
  cta_text: string
}

export type FooterSectionData = {
  brand_name: string
  description: string
  copyright: string
  links: NavLink[]
  social_links: string[]
}

export type HeroType = "image" | "text"
export type ContentType = "both" | "image_only" | "text_only" | "slider"
export type SectionType = "hero" | "columns" | "gallery" | "testimonials" | "stats" | "overlay" | "navbar" | "footer"
export type Size = "sm" | "md" | "lg" | "xl"

export type ColumnItem = {
  position: number
  content_type: ContentType
  title: string
  image_file: File | null
  image_preview_url: string
  images: string[]
  text: string
}

export type GalleryItem = {
  title: string
  image_file: File | null
  image_preview_url: string
}

export type ReviewItem = {
  quote: string
  author: string
  role: string
}

export type MetricItem = {
  label: string
  value: string
}

export type HeroSectionData = {
  layout_style: "centered_bg" | "split_50_50" | "minimal_text"
  hero_type: HeroType
  hero_title: string
  hero_subtitle: string
  cta_text: string
  hero_text_color: string
  hero_font_family: string
  hero_font_size: Size
  hero_image_file: File | null
  hero_image_preview_url: string
  hero_image_preview_urls: string[]
}

export type ColumnsSectionData = {
  layout_style: "grid_cards" | "asymmetric_featured" | "alternating_rows"
  title: string
  subtitle: string
  column_count: number
  columns: ColumnItem[]
}

export type GallerySectionData = {
  layout_style: "masonry_grid" | "row_grid"
  title: string
  subtitle: string
  items: GalleryItem[]
}

export type TestimonialsSectionData = {
  layout_style: "quote_cards" | "full_width_quote"
  title: string
  reviews: ReviewItem[]
}

export type StatsSectionData = {
  layout_style: "metric_grid" | "banner_stats"
  title: string
  metrics: MetricItem[]
}

export type OverlaySectionData = {
  layout_style: "full_bg_banner" | "split_cta"
  overlay_title: string
  overlay_subtitle: string
  overlay_text_color: string
  overlay_font_family: string
  overlay_font_size: Size
  overlay_image_file: File | null
  overlay_image_preview_url: string
  overlay_image_preview_urls: string[]
  cta_text: string
}

export type ProductData = {
  id?: number
  name: string
  price: string
  description?: string
  stock?: number
  image_url: string
}

export type CatalogCategoryData = {
  name: string
  products: ProductData[]
}
