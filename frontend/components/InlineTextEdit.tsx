'use client'

import { useState, useRef, useEffect, type CSSProperties } from "react"

export default function InlineTextEdit({
  value,
  onChange,
  multiline = false,
  className = "",
  style,
  emptyPlaceholder,
  ariaLabel,
}: {
  value: string
  onChange: (text: string) => void
  multiline?: boolean
  className?: string
  style?: CSSProperties
  emptyPlaceholder?: string
  ariaLabel?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  const editClass = `w-full bg-transparent outline-none text-center rounded px-1 -mx-1 border border-blue-400/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 ${className}`

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={(el) => { inputRef.current = el }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          draggable={false}
          onDragStart={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              commit()
            }
          }}
          rows={3}
          className={`${editClass} resize-none`}
          style={style}
          aria-label={ariaLabel}
        />
      )
    }
    return (
      <input
        ref={(el) => { inputRef.current = el }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          }
          if (e.key === "Escape") {
            setEditing(false)
          }
        }}
        className={editClass}
        style={style}
        aria-label={ariaLabel}
      />
    )
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        startEdit()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          startEdit()
        }
      }}
      draggable={false}
      onDragStart={(e) => e.stopPropagation()}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel ? `Edit ${ariaLabel}` : "Edit text"}
      title="Click to edit"
      className={`inline-block min-w-[1ch] rounded px-1 -mx-1 transition hover:outline hover:outline-2 hover:outline-blue-400/50 hover:cursor-text ${className}`}
      style={style}
    >
      {value || emptyPlaceholder || <>&nbsp;</>}
    </span>
  )
}
