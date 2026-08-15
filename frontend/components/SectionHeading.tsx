'use client'

import InlineTextEdit from "@/components/InlineTextEdit"

export default function SectionHeading({
  title,
  subtitle,
  onTitleChange,
  onSubtitleChange,
}: {
  title: string
  subtitle: string
  onTitleChange?: (text: string) => void
  onSubtitleChange?: (text: string) => void
}) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
        {onTitleChange ? (
          <InlineTextEdit value={title} onChange={onTitleChange} emptyPlaceholder="Titre de section" className="text-3xl md:text-4xl font-bold tracking-tight" />
        ) : (
          title
        )}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-slate-500 text-lg max-w-lg mx-auto">
          {onSubtitleChange ? (
            <InlineTextEdit value={subtitle} onChange={onSubtitleChange} emptyPlaceholder="Sous-titre" multiline className="text-slate-500 text-lg" />
          ) : (
            subtitle
          )}
        </p>
      ) : null}
    </div>
  )
}
