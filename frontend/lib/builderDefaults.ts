import type { SectionType } from "@/components/types"
import type {
  HeroSectionData,
  ColumnsSectionData,
  GallerySectionData,
  TestimonialsSectionData,
  StatsSectionData,
  OverlaySectionData,
  NavbarSectionData,
  FooterSectionData,
  ColumnItem,
} from "@/components/types"
import { defaultThemeState } from "@/components/theme"
import type { SectionData, SectionInstance, ConfigState } from "@/types/builder"
import type { CatalogCategoryData } from "@/components/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

export const emptyColumns = (): ColumnItem[] =>
  [1, 2, 3, 4].map((position) => ({
    position,
    content_type: "both",
    title: "",
    image_file: null,
    image_preview_url: "",
    images: [],
    text: "",
  }))

export const genSectionId = (type: SectionType): string =>
  `${type}_${
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`

// ── Default section data factories ───────────────────────────────────────────

export const defaultHeroData = (): HeroSectionData => ({
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

export const defaultColumnsData = (): ColumnsSectionData => ({
  layout_style: "grid_cards",
  title: "Nos services",
  subtitle: "Découvrez ce que nous pouvons faire pour vous",
  column_count: 3,
  columns: emptyColumns(),
})

export const defaultGalleryData = (): GallerySectionData => ({
  layout_style: "masonry_grid",
  title: "Galerie",
  subtitle: "Quelques images de nos réalisations",
  items: [1, 2, 3, 4, 5, 6].map((i) => ({ title: `Photo ${i}`, image_file: null, image_preview_url: "" })),
})

export const defaultTestimonialsData = (): TestimonialsSectionData => ({
  layout_style: "quote_cards",
  title: "Ils nous font confiance",
  reviews: [
    { quote: "Un service exceptionnel du début à la fin.", author: "Marie D.", role: "Cliente" },
    { quote: "Une équipe à l'écoute et très professionnelle.", author: "Julien R.", role: "Client" },
    { quote: "Je recommande vivement, résultats au-delà de mes attentes.", author: "Sophie M.", role: "Cliente" },
  ],
})

export const defaultStatsData = (): StatsSectionData => ({
  layout_style: "metric_grid",
  title: "Nos chiffres clés",
  metrics: [
    { label: "Clients satisfaits", value: "500+" },
    { label: "Projets livrés", value: "1200+" },
    { label: "Années d'expérience", value: "15+" },
    { label: "Support réactif", value: "24/7" },
  ],
})

export const defaultOverlayData = (): OverlaySectionData => ({
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

export const defaultNavbarData = (): NavbarSectionData => ({
  brand_name: "",
  links: [
    { label: "Accueil", href: "#" },
    { label: "Services", href: "#" },
    { label: "Contact", href: "#" },
  ],
  cta_text: "Contact",
})

export const defaultFooterData = (): FooterSectionData => ({
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

export const defaultSectionData = (type: SectionType): SectionData => {
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

export const defaultConfigState: ConfigState = {
  sections: [
    { id: "hero_1", type: "hero", data: defaultHeroData() } as SectionInstance,
    { id: "columns_1", type: "columns", data: defaultColumnsData() } as SectionInstance,
    { id: "overlay_1", type: "overlay", data: defaultOverlayData() } as SectionInstance,
  ],
  theme: defaultThemeState(),
}

// ── Default catalog ───────────────────────────────────────────────────────────

export const defaultCatalog = (): CatalogCategoryData[] => [
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
