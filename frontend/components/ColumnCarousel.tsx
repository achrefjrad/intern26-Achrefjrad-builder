'use client'

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"

import { getImageUrl } from "@/components/imageUrl"

export default function ColumnCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 4000)
    return () => clearInterval(id)
  }, [images.length])

  if (images.length === 1) {
    return (
      <img src={getImageUrl(images[0])} alt="Slide 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    )
  }

  return (
    <div className="relative w-full h-full">
      {images.map((url, i) => (
        <img
          key={`${i}-${url}`}
          src={getImageUrl(url)}
          alt={`Slide ${i + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={(e) => {
              e.stopPropagation()
              setIndex(i)
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
