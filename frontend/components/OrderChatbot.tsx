'use client'

import { useState, useRef, useCallback, useEffect, type FormEvent } from "react"

import { API_ENDPOINTS } from "@/lib/config"

const ORDERS_URL = API_ENDPOINTS.orders
const CHAT_URL = API_ENDPOINTS.chat

type ProductData = {
  id?: number
  name: string
  price: string
  description?: string
  stock?: number
  image_url: string
}

type CatalogCategoryData = {
  name: string
  products: ProductData[]
}

type ChatMessage = { sender: "bot" | "user"; text: string }

type ChatOrderDetails = {
  product_name: string
  name: string
  phone: string
  address: string
  email: string
  quantity?: number
}

export default function OrderChatbot({
  open,
  onOpenChange,
  catalog,
  projectName,
  prefillMessage,
  onDecrementStock,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: CatalogCategoryData[]
  projectName: string
  prefillMessage: string | null
  onDecrementStock: (productName: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Bonjour ! Je suis l'assistant de votre boutique. Je peux vous renseigner sur nos produits et prendre vos commandes. Comment puis-je vous aider ?",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesRef = useRef(messages)
  const endRef = useRef<HTMLDivElement | null>(null)
  const handledPrefillRef = useRef<string | null>(null)
  const orderStateRef = useRef<Partial<ChatOrderDetails>>({})

  const pushMessage = useCallback((msg: ChatMessage) => {
    const next = [...messagesRef.current, msg]
    messagesRef.current = next
    setMessages(next)
  }, [])

  const handleOrder = useCallback(
    async (details: ChatOrderDetails) => {
      const product = catalog.flatMap((cat) => cat.products).find((p) => p.name === details.product_name)
      if (!product) {
        pushMessage({
          sender: "bot",
          text: "Je n'ai pas pu identifier ce produit dans la boutique pour créer la commande.",
        })
        return
      }
      let first_name = (details.name || "").trim()
      let last_name = ""
      const nameParts = first_name.split(/\s+/)
      if (nameParts.length > 1) {
        first_name = nameParts[0]
        last_name = nameParts.slice(1).join(" ")
      } else {
        last_name = first_name
      }
      if (!first_name) first_name = "-"
      if (!last_name) last_name = "-"
      try {
        const res = await fetch(ORDERS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: projectName,
            first_name,
            last_name,
            email: details.email || "",
            phone: details.phone || "",
            address: details.address || "",
            items: [
              {
                ...(typeof product.id === "number" ? { product_id: product.id } : {}),
                product_name: details.product_name,
                quantity:
                  typeof details.quantity === "number" && details.quantity >= 1
                    ? details.quantity
                    : 1,
              },
            ],
          }),
        })
        if (res.status === 201) {
          const json = await res.json()
          pushMessage({ sender: "bot", text: `🎉 Votre commande n°#${json.order_id} a été validée avec succès !` })
          onDecrementStock(details.product_name)
          // La commande est persistée : on remet l'état actif à vide. Ainsi les
          // messages suivants ("شكرا", "merci", ...) ne recréent pas la commande
          // et une nouvelle commande éventuelle repart de zéro.
          orderStateRef.current = {}
        } else {
          let msg = "Votre commande n'a pas pu être validée. Veuillez réessayer."
          try {
            const err = await res.json()
            if (err?.error) msg = err.error
          } catch {
            // keep generic message
          }
          pushMessage({ sender: "bot", text: msg })
        }
      } catch {
        pushMessage({
          sender: "bot",
          text: "Impossible de valider la commande. Vérifiez que le serveur est accessible.",
        })
      }
    },
    [catalog, projectName, onDecrementStock, pushMessage]
  )

  const sendUserMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (!text || isTyping) return
      const history = messagesRef.current
      pushMessage({ sender: "user", text })
      setInputMessage("")
      setIsTyping(true)
      try {
        const res = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: projectName,
            catalog,
            message_history: history,
            user_message: text,
            order_state: orderStateRef.current,
          }),
        })
        if (!res.ok) throw new Error(`Chat API error ${res.status}`)
        const data = await res.json()
        if (data && typeof data.reply === "string") {
          pushMessage({ sender: "bot", text: data.reply })
        }
        if (data?.order_details && typeof data.order_details === "object") {
          const returned = data.order_details as Partial<ChatOrderDetails>
          const merged: Record<string, string | number | undefined> = {
            ...orderStateRef.current,
          }
          for (const [key, value] of Object.entries(returned)) {
            if (key === "quantity") {
              if (typeof value === "number" && value >= 1) merged[key] = value
            } else if (typeof value === "string" && value.trim() !== "") {
              merged[key] = value
            }
          }
          orderStateRef.current = merged as Partial<ChatOrderDetails>
        }
        if (data?.order_ready === true && data.order_details) {
          const details: ChatOrderDetails = {
            product_name: data.order_details.product_name || orderStateRef.current.product_name || "",
            name: data.order_details.name || orderStateRef.current.name || "",
            phone: data.order_details.phone || orderStateRef.current.phone || "",
            address: data.order_details.address || orderStateRef.current.address || "",
            email: data.order_details.email || orderStateRef.current.email || "",
            quantity:
              typeof data.order_details.quantity === "number" && data.order_details.quantity >= 1
                ? data.order_details.quantity
                : typeof orderStateRef.current.quantity === "number" && orderStateRef.current.quantity >= 1
                  ? orderStateRef.current.quantity
                  : undefined,
          }
          await handleOrder(details)
        }
      } catch {
        pushMessage({
          sender: "bot",
          text: "Oups, je n'arrive pas à contacter l'assistant. Vérifiez que le serveur est bien lancé, puis réessayez.",
        })
      } finally {
        setIsTyping(false)
      }
    },
    [isTyping, projectName, catalog, handleOrder, pushMessage]
  )

  useEffect(() => {
    if (open && prefillMessage && handledPrefillRef.current !== prefillMessage) {
      handledPrefillRef.current = prefillMessage
      void sendUserMessage(prefillMessage)
    }
  }, [open, prefillMessage, sendUserMessage])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const onSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inputMessage.trim() || isTyping) return
    void sendUserMessage(inputMessage)
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-5 py-3 text-sm font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition"
        >
          <span className="text-lg leading-none">💬</span> Assistant AI
        </button>
      )}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-600 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 shrink-0 rounded-full bg-white/20 flex items-center justify-center text-lg">💬</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">Assistant AI</p>
                <p className="text-[11px] text-indigo-200">Service client &amp; commandes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Fermer le chat"
              className="shrink-0 p-1.5 rounded-lg text-indigo-100 hover:text-white hover:bg-white/10 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    m.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:100ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:200ms]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSend} className="border-t border-slate-200 p-3 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              disabled={isTyping}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isTyping || !inputMessage.trim()}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              aria-label="Envoyer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
