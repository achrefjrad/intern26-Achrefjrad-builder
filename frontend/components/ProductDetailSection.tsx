'use client'

/* eslint-disable @next/next/no-img-element */

import InlineTextEdit from "@/components/InlineTextEdit"
import { useTheme, themeRadiusClass } from "@/components/theme"
import { getImageUrl } from "@/components/imageUrl"
import type { CatalogCategoryData, ProductData } from "@/components/types"

export default function ProductDetailSection({
  catalog,
  activeProductInfo,
  onProductChange,
  onBack,
  onOrderProduct,
}: {
  catalog: CatalogCategoryData[]
  activeProductInfo: { categoryIndex: number; productIndex: number } | null
  onProductChange: (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) => void
  onBack: () => void
  onOrderProduct: () => void
}) {
  const theme = useTheme()
  const radius = themeRadiusClass[theme.border_radius] ?? themeRadiusClass.lg
  const catIndex = activeProductInfo ? Math.min(Math.max(activeProductInfo.categoryIndex, 0), Math.max(catalog.length - 1, 0)) : 0
  const prodIndex = activeProductInfo?.productIndex ?? 0
  const category = catalog[catIndex]
  const product = activeProductInfo ? category?.products?.[prodIndex] : undefined
  const stock = product ? (product.stock ?? 0) : 0

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour aux produits
        </button>

        {product ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className={`overflow-hidden bg-slate-100 ${radius} shadow-sm ring-1 ring-slate-200`}>
              {product.image_url ? (
                <img src={getImageUrl(product.image_url)} alt={product.name} className="w-full h-auto object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <svg className="w-24 h-24 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <p className="text-sm font-medium uppercase tracking-wide" style={{ color: theme.primary_color }}>
                {category?.name || "Catégorie"}
              </p>

              <h2 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                <InlineTextEdit
                  value={product.name}
                  onChange={(name) => onProductChange(catIndex, prodIndex, { name })}
                  emptyPlaceholder="Nom du produit"
                  className="text-3xl md:text-4xl font-bold tracking-tight"
                  ariaLabel="Product name"
                />
              </h2>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">
                  <InlineTextEdit
                    value={product.price}
                    onChange={(price) => onProductChange(catIndex, prodIndex, { price })}
                    emptyPlaceholder="Prix"
                    className="text-2xl font-bold text-slate-900"
                    ariaLabel="Product price"
                  />
                </span>
                {stock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    En stock : {stock}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Rupture de stock
                  </span>
                )}
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-2">Description</p>
                <div className="text-slate-600 leading-relaxed text-base">
                  <InlineTextEdit
                    value={product.description || ""}
                    onChange={(description) => onProductChange(catIndex, prodIndex, { description })}
                    multiline
                    emptyPlaceholder="Ajoutez une description engageante pour ce produit..."
                    className="text-slate-600 text-base leading-relaxed"
                    ariaLabel="Product description"
                  />
                </div>
              </div>

              <div className="mt-10">
                <button
                  type="button"
                  disabled={stock === 0}
                  onClick={onOrderProduct}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: stock === 0 ? "#94a3b8" : theme.primary_color }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  {stock === 0 ? "Rupture de stock" : "Commander"}
                </button>
                {stock === 0 && <p className="mt-3 text-sm text-red-600 font-medium">Ce produit n&apos;est actuellement pas disponible.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-16 p-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-sm font-medium text-slate-500">Produit introuvable. Retournez à la boutique.</p>
          </div>
        )}
      </div>
    </section>
  )
}
