'use client'

import type { CatalogCategoryData, ProductData } from "@/components/types"
import StockStepper from "@/components/StockStepper"

export function ProductEditorPanel({
  catalog,
  activeProductInfo,
  onProductChange,
}: {
  catalog: CatalogCategoryData[]
  activeProductInfo: { categoryIndex: number; productIndex: number } | null
  onProductChange: (categoryIndex: number, productIndex: number, patch: Partial<ProductData>) => void
}) {
  const catIndex = activeProductInfo ? Math.min(Math.max(activeProductInfo.categoryIndex, 0), Math.max(catalog.length - 1, 0)) : 0
  const prodIndex = activeProductInfo?.productIndex ?? 0
  const category = catalog[catIndex]
  const product = activeProductInfo ? category?.products?.[prodIndex] : undefined
  const stock = product ? (product.stock ?? 0) : 0

  return (
    <div className="relative h-full">
      <div className="p-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Éditeur Fiche Produit</h1>
          <p className="text-sm text-slate-500 mt-1">Modifiez les informations de la fiche produit sélectionnée.</p>
        </div>

        {!product ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <div className="text-4xl mb-3">
              <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">Aucun produit sélectionné.</p>
            <p className="text-xs text-slate-400 mt-1">Sélectionnez un produit dans la boutique pour l&apos;éditer.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Catégorie</p>
              <p className="text-sm font-semibold text-slate-800">{category?.name || "Sans catégorie"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit</label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => onProductChange(catIndex, prodIndex, { name: e.target.value })}
                placeholder="Nom du produit"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prix</label>
              <input
                type="text"
                value={product.price}
                onChange={(e) => onProductChange(catIndex, prodIndex, { price: e.target.value })}
                placeholder="Ex. 24.99 €"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
              <StockStepper value={stock} onChange={(stock) => onProductChange(catIndex, prodIndex, { stock })} size="md" />
              <p className="text-xs text-slate-400 mt-1.5">Incrémentez ou décrémentez directement le stock disponible.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={product.description || ""}
                onChange={(e) => onProductChange(catIndex, prodIndex, { description: e.target.value })}
                rows={6}
                placeholder="Ajoutez une description engageante pour ce produit..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition"
              />
            </div>

            <div className={`rounded-xl border p-4 text-center ${stock > 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              {stock > 0 ? (
                <p className="text-sm font-semibold text-emerald-700">
                  En stock : {stock} exemplaire{stock > 1 ? "s" : ""} disponibles
                </p>
              ) : (
                <p className="text-sm font-semibold text-red-700">Rupture de stock</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
