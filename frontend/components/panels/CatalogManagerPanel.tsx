'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from "react"
import type { CatalogCategoryData, ProductData } from "@/components/types"
import { getImageUrl } from "@/components/imageUrl"
import StockStepper from "@/components/StockStepper"

export function CatalogManagerPanel({
  catalog,
  selectedProduct,
  onCategoryNameChange,
  onProductChange,
  onSelectProduct,
  onViewProductDetail,
  isCatalogLoading = false,
}: {
  catalog: CatalogCategoryData[]
  selectedProduct: { categoryIndex: number; productIndex: number } | null
  onCategoryNameChange: (categoryIndex: number, name: string) => void
  onProductChange: (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) => void
  onSelectProduct: (categoryIndex: number, productIndex: number) => void
  onViewProductDetail: (categoryIndex: number, productIndex: number) => void
  isCatalogLoading?: boolean
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const totalProducts = catalog.reduce((sum, cat) => sum + cat.products.length, 0)
  const isExpanded = (i: number) => expanded[i] ?? true

  const toggle = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !(prev[i] ?? true) }))

  const isSelected = (ci: number, pi: number): boolean =>
    selectedProduct !== null && selectedProduct.categoryIndex === ci && selectedProduct.productIndex === pi

  return (
    <div className="relative h-full">
      <div className="p-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">🛍️ Structure du Catalogue</h1>
          <p className="text-sm text-slate-500 mt-1">
            {catalog.length} Catégories · {totalProducts} produits — cliquez sur un produit pour le repérer dans l&apos;aperçu.
          </p>
        </div>

        {isCatalogLoading && (
          <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            L&apos;IA génère actuellement votre catalogue en arrière-plan...
          </div>
        )}

        <div className="space-y-4">
          {catalog.map((cat, ci) => {
            const open = isExpanded(ci)
            const catSelected = selectedProduct?.categoryIndex === ci
            return (
              <section
                key={`cat-${ci}`}
                className={`bg-white rounded-xl shadow-sm border transition ${
                  catSelected ? "border-blue-400 ring-1 ring-blue-400/40" : "border-slate-200"
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(ci)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggle(ci)
                    }
                  }}
                  className="flex items-center gap-3 p-4 cursor-pointer select-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold shrink-0">
                    {ci + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => onCategoryNameChange(ci, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Nom de la catégorie"
                      aria-label={`Nom de la catégorie ${ci + 1}`}
                      className="w-full bg-transparent text-sm font-semibold text-slate-800 border border-transparent hover:border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                    />
                    <p className="text-xs text-slate-400 px-2">{cat.products.length} produits</p>
                  </div>
                  <span className="text-xs font-semibold rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 shrink-0">
                    {cat.products.length}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>

                {open && (
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    {cat.products.map((product, pi) => {
                      const selected = isSelected(ci, pi)
                      return (
                        <div
                          key={`prod-${ci}-${pi}`}
                          onClick={() => onSelectProduct(ci, pi)}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition cursor-pointer ${
                            selected
                              ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/40"
                              : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-white"
                          }`}
                        >
                          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            {product.image_url ? (
                              <img src={getImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => onProductChange(ci, pi, { name: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Nom du produit"
                              aria-label={`Nom du produit ${pi + 1}`}
                              className="w-full bg-transparent text-sm font-medium text-slate-800 border border-transparent hover:border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={product.price}
                                onChange={(e) => onProductChange(ci, pi, { price: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Prix"
                                aria-label={`Prix du produit ${pi + 1}`}
                                className="w-20 bg-transparent text-xs font-semibold text-indigo-600 border border-transparent hover:border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                              />
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  (product.stock ?? 0) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {(product.stock ?? 0) > 0 ? "En stock" : "Rupture"}
                              </span>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-end gap-1.5 shrink-0">
                            <StockStepper value={product.stock ?? 0} onChange={(stock) => onProductChange(ci, pi, { stock })} />
                            <button
                              type="button"
                              onClick={() => onViewProductDetail(ci, pi)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Fiche
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
