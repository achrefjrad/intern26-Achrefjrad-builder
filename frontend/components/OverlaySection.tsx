'use client'

/* eslint-disable @next/next/no-img-element */

import InlineTextEdit from "@/components/InlineTextEdit"
import CtaButton from "@/components/CtaButton"
import ChangeImageBadge from "@/components/ChangeImageBadge"
import { useTheme, themeRadiusClass } from "@/components/theme"
import { getImageUrl } from "@/components/imageUrl"
import type { OverlaySectionData } from "@/components/types"

export default function OverlaySection({
  data,
  onTitleChange,
  onSubtitleChange,
  onChangeImage,
}: {
  data: OverlaySectionData
  onTitleChange: (text: string) => void
  onSubtitleChange: (text: string) => void
  onChangeImage: () => void
}) {
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
  const textStyle = { color: data.overlay_text_color, fontFamily }
  const subStyle = { color: data.overlay_text_color, fontFamily, opacity: 0.8 }
  const radius = themeRadiusClass[useTheme().border_radius] ?? themeRadiusClass.lg

  const content = (
    <div className="relative max-w-3xl mx-auto text-center">
      <h2 className={`font-bold tracking-tight ${sizeClasses[data.overlay_font_size] ?? sizeClasses.lg}`} style={textStyle}>
        <InlineTextEdit
          value={data.overlay_title}
          onChange={onTitleChange}
          emptyPlaceholder="Prêt à démarrer ?"
          className={`font-bold tracking-tight ${sizeClasses[data.overlay_font_size] ?? sizeClasses.lg}`}
          style={textStyle}
          ariaLabel="Overlay title"
        />
      </h2>
      <p className="mt-3" style={subStyle}>
        <InlineTextEdit
          value={data.overlay_subtitle}
          onChange={onSubtitleChange}
          emptyPlaceholder="Ajoutez une image de fond pour mettre en valeur cette section."
          multiline
          className="mt-3"
          style={subStyle}
          ariaLabel="Overlay subtitle"
        />
      </p>
      <div className="mt-6">
        <CtaButton text={data.cta_text || "Contactez-nous"} />
      </div>
    </div>
  )

  const bgImage = overlayImages.length > 0 ? getImageUrl(overlayImages[0]) : ""
  const overlayBase = `relative w-full py-24 px-6 overflow-hidden group cursor-pointer ${radius}`

  if (data.layout_style === "split_cta") {
    return (
      <section className={`relative w-full py-16 px-6 ${radius}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-8">
          <div className="text-center md:text-left">
            <h2 className={`font-bold tracking-tight ${sizeClasses[data.overlay_font_size] ?? sizeClasses.lg} text-slate-900`}>
              <InlineTextEdit
                value={data.overlay_title}
                onChange={onTitleChange}
                emptyPlaceholder="Prêt à démarrer ?"
                className={`font-bold tracking-tight ${sizeClasses[data.overlay_font_size] ?? sizeClasses.lg} text-slate-900`}
                ariaLabel="Overlay title"
              />
            </h2>
            <p className="mt-3 text-slate-600 text-lg leading-relaxed">
              <InlineTextEdit
                value={data.overlay_subtitle}
                onChange={onSubtitleChange}
                emptyPlaceholder="Sous-titre de votre call-to-action."
                multiline
                className="text-slate-600 text-lg"
                ariaLabel="Overlay subtitle"
              />
            </p>
            <div className="mt-6">
              <CtaButton text={data.cta_text || "Contactez-nous"} />
            </div>
          </div>
          <div
            className={`relative aspect-[4/3] rounded-2xl overflow-hidden group ${radius}`}
            onClick={onChangeImage}
          >
            {bgImage ? (
              <img src={bgImage} alt="CTA" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
                <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}
            <ChangeImageBadge onClick={onChangeImage} label={bgImage ? "Change Image" : "Add Image"} />
          </div>
        </div>
      </section>
    )
  }

  if (overlayImages.length === 0) {
    return (
      <section
        className={`${overlayBase} bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950`}
        onClick={onChangeImage}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99,102,241,0.4) 0%, transparent 50%)`,
          }}
        />
        {content}
        <ChangeImageBadge onClick={onChangeImage} label="Add Image" />
      </section>
    )
  }

  return (
    <section
      className={overlayBase}
      style={{ backgroundImage: `url("${bgImage}")`, backgroundSize: "cover", backgroundPosition: "center" }}
      onClick={onChangeImage}
    >
      <div className="absolute inset-0 bg-slate-900/70" />
      {content}
      <ChangeImageBadge onClick={onChangeImage} label="Change Image" />
    </section>
  )
}
