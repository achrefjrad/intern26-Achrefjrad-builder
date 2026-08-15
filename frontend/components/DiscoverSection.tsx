'use client'

/* eslint-disable @next/next/no-img-element */

import InlineTextEdit from "@/components/InlineTextEdit"
import { useTheme, themeRadiusClass } from "@/components/theme"
import { getImageUrl } from "@/components/imageUrl"
import type { CatalogCategoryData, ProductData } from "@/components/types"

export default function DiscoverSection({
  catalog,
  onCategoryNameChange,
  onProductChange,
  onViewProductDetail,
  selectedProduct,
  onSelectProduct,
  activeCategory,
  onActiveCategoryChange,
}: {
  catalog: CatalogCategoryData[]
  onCategoryNameChange: (categoryIndex: number, name: string) => void
  onProductChange: (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) => void
  onViewProductDetail: (categoryIndex: number, productIndex: number) => void
  selectedProduct: { categoryIndex: number; productIndex: number } | null
  onSelectProduct: (categoryIndex: number, productIndex: number) => void
  activeCategory: number
  onActiveCategoryChange: (categoryIndex: number) => void
}) {
  const theme = useTheme()
  const safeIndex = Math.min(Math.max(activeCategory, 0), Math.max(catalog.length - 1, 0))
  const category = catalog[safeIndex]
  const products = category?.products || []

  const radius = themeRadiusClass[theme.border_radius] ?? themeRadiusClass.lg

  const isSelected = (pi: number): boolean =>
    selectedProduct !== null &&
    selectedProduct.categoryIndex === safeIndex &&
    selectedProduct.productIndex === pi

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            <InlineTextEdit value={category?.name || "Produits"} onChange={(name) => onCategoryNameChange(safeIndex, name)} emptyPlaceholder="Catégorie" className="text-3xl md:text-4xl font-bold tracking-tight" ariaLabel="Category name" />
          </h2>
          <p className="mt-2 text-slate-500">Découvrez nos produits par catégorie.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          <aside className="p-4 bg-white rounded-xl shadow-sm ring-1 ring-slate-200 h-fit sticky top-20 self-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-2 py-1">Catégories</p>
            <div className="space-y-1">
              {catalog.map((cat, i) => (
                <button
                  key={`cat-${i}`}
                  type="button"
                  onClick={() => onActiveCategoryChange(i)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    i === safeIndex ? "text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  style={i === safeIndex ? { backgroundColor: theme.primary_color } : undefined}
                >
                  <span className="truncate">
                    <InlineTextEdit
                      value={cat.name}
                      onChange={(name) => onCategoryNameChange(i, name)}
                      emptyPlaceholder="Catégorie"
                      className={i === safeIndex ? "text-sm font-medium text-white" : "text-sm font-medium text-slate-600"}
                      ariaLabel="Category name"
                    />
                  </span>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${i === safeIndex ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {cat.products.length}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full p-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-sm font-medium text-slate-500">Aucun produit dans cette catégorie.</p>
              </div>
            ) : (
              products.map((product, pi) => (
                <div
                  key={`prod-${pi}`}
                  onClick={() => onSelectProduct(safeIndex, pi)}
                  className={`group flex flex-col overflow-hidden bg-white ${radius} shadow-sm transition-all duration-300 ${
                    isSelected(pi)
                      ? "ring-4 ring-blue-500 ring-offset-4 ring-offset-white scale-[1.02] shadow-xl shadow-blue-500/10"
                      : "ring-1 ring-slate-200 hover:shadow-lg"
                  }`}
                >
                  {isSelected(pi) && (
                    <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Sélectionné
                    </div>
                  )}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    {product.image_url ? (
                      <img src={getImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-sm" style={{ backgroundColor: theme.primary_color }}>
                      <InlineTextEdit
                        value={product.price}
                        onChange={(price) => onProductChange(safeIndex, pi, { price })}
                        emptyPlaceholder="Prix"
                        className="text-xs font-bold text-white"
                        ariaLabel="Product price"
                      />
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-base font-semibold text-slate-900 mb-3">
                      <InlineTextEdit
                        value={product.name}
                        onChange={(name) => onProductChange(safeIndex, pi, { name })}
                        emptyPlaceholder="Nom du produit"
                        className="text-base font-semibold text-slate-900"
                        ariaLabel="Product name"
                      />
                    </h3>
                    <div className="mt-auto flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: theme.primary_color }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                        Ajouter au panier
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewProductDetail(safeIndex, pi)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold transition border"
                        style={{ color: theme.primary_color, borderColor: `${theme.primary_color}55` }}
                      >
                        Voir détail
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
