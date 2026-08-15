'use client'

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"

import InlineTextEdit from "@/components/InlineTextEdit"
import CtaButton from "@/components/CtaButton"
import ChangeImageBadge from "@/components/ChangeImageBadge"
import { useTheme, themeRadiusClass } from "@/components/theme"
import { getImageUrl } from "@/components/imageUrl"
import type { HeroSectionData } from "@/components/types"

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

export default function HeroSection({
  data,
  onTitleChange,
  onSubtitleChange,
  onChangeImage,
}: {
  data: HeroSectionData
  onTitleChange: (text: string) => void
  onSubtitleChange: (text: string) => void
  onChangeImage: () => void
}) {
  const theme = useTheme()
  const heroFont = heroFontFamilies[data.hero_font_family] ?? heroFontFamilies["sans-serif"]
  const heroTitleStyle = { color: data.hero_text_color, fontFamily: heroFont }
  const heroSubtitleStyle = { color: data.hero_text_color, fontFamily: heroFont, opacity: 0.85 }
  const titleSize = heroTitleSize[data.hero_font_size] ?? heroTitleSize.xl
  const subtitleSize = heroSubtitleSize[data.hero_font_size] ?? heroSubtitleSize.xl
  const radius = themeRadiusClass[theme.border_radius] ?? themeRadiusClass.lg

  const images = data.hero_image_preview_urls.length
    ? data.hero_image_preview_urls
    : data.hero_image_preview_url
      ? [data.hero_image_preview_url]
      : []

  if (data.layout_style === "minimal_text") {
    return (
      <section className={`relative w-full py-24 px-6 overflow-hidden ${radius}`}>
        <div
          className="absolute inset-0"
          style={{ backgroundColor: theme.primary_color, opacity: 0.08 }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className={`font-bold tracking-tight mb-4 leading-tight ${titleSize} text-slate-900`}>
            <InlineTextEdit
              value={data.hero_title}
              onChange={onTitleChange}
              emptyPlaceholder="Votre titre ici"
              className={`font-bold tracking-tight ${titleSize} text-slate-900`}
              ariaLabel="Hero title"
            />
          </h1>
          <p className={`max-w-2xl mx-auto leading-relaxed text-slate-500 ${subtitleSize}`}>
            <InlineTextEdit
              value={data.hero_subtitle}
              onChange={onSubtitleChange}
              emptyPlaceholder="Votre sous-titre"
              className={`leading-relaxed ${subtitleSize} text-slate-500`}
              ariaLabel="Hero subtitle"
            />
          </p>
          <div className="mt-8">
            <CtaButton text={data.cta_text || "En savoir plus"} />
          </div>
        </div>
      </section>
    )
  }

  if (data.layout_style === "split_50_50") {
    const mainImage = images[0] || ""
    return (
      <section className={`relative w-full py-16 px-6 overflow-hidden ${radius}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          <div className="text-center md:text-left">
            <h1 className={`font-bold tracking-tight mb-4 leading-tight ${titleSize} text-slate-900`} style={{ color: data.hero_text_color === "#ffffff" ? "#0f172a" : data.hero_text_color, fontFamily: heroFont }}>
              <InlineTextEdit
                value={data.hero_title}
                onChange={onTitleChange}
                emptyPlaceholder="Votre titre ici"
                className={`font-bold tracking-tight ${titleSize}`}
                style={{ color: data.hero_text_color === "#ffffff" ? "#0f172a" : data.hero_text_color, fontFamily: heroFont }}
                ariaLabel="Hero title"
              />
            </h1>
            <p className={`max-w-xl mt-4 leading-relaxed text-slate-500 ${subtitleSize}`}>
              <InlineTextEdit
                value={data.hero_subtitle}
                onChange={onSubtitleChange}
                emptyPlaceholder="Votre sous-titre"
                className={`leading-relaxed ${subtitleSize} text-slate-500`}
                ariaLabel="Hero subtitle"
              />
            </p>
            <div className="mt-8">
              <CtaButton text={data.cta_text || "En savoir plus"} />
            </div>
          </div>
          <div
            className={`relative aspect-[4/3] rounded-2xl overflow-hidden group ${radius}`}
            onClick={onChangeImage}
          >
            {mainImage ? (
              <img src={getImageUrl(mainImage)} alt="Hero" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}
            <ChangeImageBadge onClick={onChangeImage} label={mainImage ? "Change Image" : "Add Image"} />
          </div>
        </div>
      </section>
    )
  }

  if (data.hero_type === "text") {
    return (
      <section className={`relative w-full h-[60vh] min-h-[400px] ${radius} overflow-hidden`} style={{ backgroundColor: theme.primary_color }}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 60%)`
        }} />
        <div className="text-center px-6 relative max-w-3xl mx-auto h-full flex flex-col items-center justify-center">
          <h1 className={`font-bold tracking-tight mb-6 leading-tight ${titleSize}`} style={heroTitleStyle}>
            <InlineTextEdit
              value={data.hero_title}
              onChange={onTitleChange}
              emptyPlaceholder="Welcome"
              className={`font-bold tracking-tight ${titleSize}`}
              style={heroTitleStyle}
              ariaLabel="Hero title"
            />
          </h1>
          <p className={`max-w-2xl mx-auto leading-relaxed ${subtitleSize}`} style={heroSubtitleStyle}>
            <InlineTextEdit
              value={data.hero_subtitle}
              onChange={onSubtitleChange}
              emptyPlaceholder="Your one-page website builder"
              className={`leading-relaxed ${subtitleSize}`}
              style={heroSubtitleStyle}
              ariaLabel="Hero subtitle"
            />
          </p>
          <div className="mt-8">
            <CtaButton text={data.cta_text || "En savoir plus"} />
          </div>
        </div>
      </section>
    )
  }

  if (images.length === 0) {
    return (
      <section className={`relative w-full h-[60vh] min-h-[400px] ${radius} overflow-hidden`} style={{ backgroundColor: theme.primary_color }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.6) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.3) 0%, transparent 50%)`
        }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className={`font-bold tracking-tight mb-4 ${titleSize}`} style={heroTitleStyle}>
            <InlineTextEdit
              value={data.hero_title}
              onChange={onTitleChange}
              emptyPlaceholder="Your Title Here"
              className={`font-bold tracking-tight ${titleSize}`}
              style={heroTitleStyle}
              ariaLabel="Hero title"
            />
          </h1>
          <p className={`${subtitleSize}`} style={heroSubtitleStyle}>
            <InlineTextEdit
              value={data.hero_subtitle}
              onChange={onSubtitleChange}
              emptyPlaceholder="Upload a hero banner to get started"
              className={subtitleSize}
              style={heroSubtitleStyle}
              ariaLabel="Hero subtitle"
            />
          </p>
        </div>
      </section>
    )
  }

  if (images.length === 1) {
    return (
      <section
        className={`relative w-full h-[60vh] min-h-[400px] ${radius} overflow-hidden group cursor-pointer`}
        onClick={onChangeImage}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${getImageUrl(images[0])}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className={`font-bold tracking-tight mb-4 ${titleSize}`} style={heroTitleStyle}>
            <InlineTextEdit
              value={data.hero_title}
              onChange={onTitleChange}
              emptyPlaceholder="Your Title Here"
              className={`font-bold tracking-tight ${titleSize}`}
              style={heroTitleStyle}
              ariaLabel="Hero title"
            />
          </h1>
          <p className={`max-w-xl ${subtitleSize}`} style={heroSubtitleStyle}>
            <InlineTextEdit
              value={data.hero_subtitle}
              onChange={onSubtitleChange}
              emptyPlaceholder="Your subtitle here"
              className={`max-w-xl ${subtitleSize}`}
              style={heroSubtitleStyle}
              ariaLabel="Hero subtitle"
            />
          </p>
        </div>
        <ChangeImageBadge onClick={onChangeImage} label="Change Image" />
      </section>
    )
  }

  return <HeroCarousel images={images} data={data} onTitleChange={onTitleChange} onSubtitleChange={onSubtitleChange} onChangeImage={onChangeImage} />
}

function HeroCarousel({
  images,
  data,
  onTitleChange,
  onSubtitleChange,
  onChangeImage,
}: {
  images: string[]
  data: HeroSectionData
  onTitleChange: (text: string) => void
  onSubtitleChange: (text: string) => void
  onChangeImage: () => void
}) {
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
    <section
      className="relative w-full h-[60vh] min-h-[400px] overflow-hidden group cursor-pointer"
      onClick={onChangeImage}
    >
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
          <InlineTextEdit
            value={data.hero_title}
            onChange={onTitleChange}
            emptyPlaceholder="Your Title Here"
            className={`font-bold tracking-tight ${titleSize}`}
            style={heroTitleStyle}
            ariaLabel="Hero title"
          />
        </h1>
        <p className={`max-w-xl ${subtitleSize}`} style={heroSubtitleStyle}>
          <InlineTextEdit
            value={data.hero_subtitle}
            onChange={onSubtitleChange}
            emptyPlaceholder="Your subtitle here"
            className={`max-w-xl ${subtitleSize}`}
            style={heroSubtitleStyle}
            ariaLabel="Hero subtitle"
          />
        </p>
      </div>
      <ChangeImageBadge onClick={onChangeImage} label="Change Image" />
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={(e) => {
              e.stopPropagation()
              setIndex(i)
            }}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
