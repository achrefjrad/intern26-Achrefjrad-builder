import type { ThemeState } from "@/components/theme"
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
  ColumnItem,
  GalleryItem,
  CatalogCategoryData,
} from "@/components/types"
import type {
  SectionData,
  SectionInstance,
  AiSection,
  AiConfig,
  AiCatalogCategory,
  ColumnPayload,
  GalleryItemPayload,
  ReviewPayload,
  MetricPayload,
  NavLinkPayload,
  SectionPayload,
} from "@/types/builder"
import {
  defaultNavbarData,
  defaultFooterData,
  defaultConfigState,
  emptyColumns,
  defaultCatalog,
} from "@/lib/builderDefaults"

// ── Utils ─────────────────────────────────────────────────────────────────────

export const toSize = (value: string | undefined, fallback: "sm" | "md" | "lg" | "xl"): "sm" | "md" | "lg" | "xl" =>
  value === "sm" || value === "md" || value === "lg" || value === "xl" ? value : fallback

export const isPersistedPath = (p: string) => p && !/^(blob:|data:)/.test(p)

export const formatProjectDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  } catch {
    return iso
  }
}

// ── Theme normalizer ──────────────────────────────────────────────────────────

export const normalizeTheme = (t?: Partial<ThemeState> | null): ThemeState => {
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

// ── AI → SectionData normalizers ─────────────────────────────────────────────

export const heroDataFromAi = (sec: AiSection): HeroSectionData | null => {
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

export const columnsDataFromAi = (sec: AiSection): ColumnsSectionData | null => {
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

export const galleryDataFromAi = (sec: AiSection): GallerySectionData | null => {
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

export const testimonialsDataFromAi = (sec: AiSection): TestimonialsSectionData | null => {
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

export const statsDataFromAi = (sec: AiSection): StatsSectionData | null => {
  const style = (["metric_grid", "banner_stats"] as const).includes(sec.layout_style as never)
    ? (sec.layout_style as StatsSectionData["layout_style"])
    : "metric_grid"
  const metrics = (sec.metrics || []).map((m) => ({ label: m.label || "", value: m.value || "" }))
  return { layout_style: style, title: sec.title || "", metrics }
}

export const overlayDataFromAi = (sec: AiSection): OverlaySectionData | null => {
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

export const navbarDataFromAi = (sec: AiSection): NavbarSectionData => {
  const links = (sec.links || []).map((l) => ({ label: l.label || "", href: l.href || "#" }))
  return {
    brand_name: sec.brand_name || sec.title || "",
    links: links.length ? links : defaultNavbarData().links,
    cta_text: sec.cta_text || "Contact",
  }
}

export const footerDataFromAi = (sec: AiSection): FooterSectionData => {
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

// ── normalizeAiSection ────────────────────────────────────────────────────────

export const normalizeAiSection = (raw: AiSection): SectionInstance | null => {
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

// ── sectionsFromAI ────────────────────────────────────────────────────────────

export const sectionsFromAI = (ai: AiConfig): { sections: SectionInstance[]; theme: ThemeState } => {
  const theme = normalizeTheme(ai.theme)
  const sections =
    Array.isArray(ai.sections) && ai.sections.length > 0
      ? (ai.sections.map(normalizeAiSection).filter(Boolean) as SectionInstance[])
      : defaultConfigState.sections
  return { sections: sections.length ? sections : defaultConfigState.sections, theme }
}

// ── normalizeSection (from API/DB payload) ────────────────────────────────────

export const normalizeSection = (sec: SectionPayload): SectionInstance | null => {
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

  // overlay
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

// ── normalizeCatalog ──────────────────────────────────────────────────────────

export const normalizeCatalog = (catalog?: AiCatalogCategory[] | null): CatalogCategoryData[] => {
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

// ── cloneSectionData ──────────────────────────────────────────────────────────

export const cloneSectionData = (data: SectionData): SectionData => {
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

// ── serializeSections ─────────────────────────────────────────────────────────

export const serializeSections = (sections: SectionInstance[]): SectionPayload[] =>
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
