'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"

import { API_ENDPOINTS } from "@/lib/config"

const API_URL = API_ENDPOINTS.generateHomepage

const EXAMPLES = [
  "Site pour une boulangerie artisanale à Lyon avec 3 colonnes pour nos spécialités",
  "Portfolio de photographe minimaliste avec bannière texte et 4 colonnes",
  "Page d'accueil pour un cabinet d'architectes avec 2 colonnes de services",
]

export default function AssistantPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Veuillez décrire le site que vous souhaitez créer.")
      return
    }
    setLoading(true)
    setError(null)
    setStatus("L'IA génère votre page d'accueil...")

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      if (!res.ok) {
        let message = `Erreur ${res.status} : impossible de générer la configuration.`
        try {
          const errData = await res.json()
          if (errData?.error) message = errData.error
        } catch {
          // Response body was not JSON; keep the generic message
        }
        setError(message)
        setStatus(null)
        return
      }

      const data = await res.json()

      localStorage.setItem(
        "ai_generated_config",
        JSON.stringify({ ...data, original_prompt: prompt.trim(), pending_catalog: true })
      )
      setStatus("Page d'accueil prête ! Redirection vers l'éditeur...")
      setTimeout(() => router.push("/"), 400)
    } catch {
      setError("Impossible de contacter l'IA. Vérifiez que le serveur est lancé.")
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Assistant IA
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Créer votre site avec l&apos;IA</h1>
            <p className="text-slate-500 mt-2">Décrivez votre projet en français, l&apos;IA génère votre configuration en quelques secondes.</p>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              setError(null)
            }}
            placeholder="Ex : Créez un site pour mon restaurant italien avec un menu en 3 colonnes..."
            rows={5}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none"
          />

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Exemples rapides :</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="text-xs bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-transparent rounded-full px-3 py-1.5 transition text-left"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Génération en cours...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m6.366-.366l-2.12 2.12M21 12h-3m.366 6.366l-2.12-2.12M12 21v-3m-6.366.366l2.12-2.12M3 12h3m-.366-6.366l2.12 2.12" />
                </svg>
                Générer ma configuration
              </>
            )}
          </button>

          {status && !error && (
            <p className="mt-4 text-center text-sm text-indigo-600 font-medium flex items-center justify-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
