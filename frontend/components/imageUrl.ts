const API_ORIGIN = "http://127.0.0.1:8000"

export const getImageUrl = (path: string): string => {
  if (!path) return ""
  if (/^(https?:|data:|blob:|file:)/i.test(path)) return path
  const encodeSegments = (p: string) => p.split("/").map(encodeURIComponent).join("/")
  if (path.startsWith("/")) return `${API_ORIGIN}${encodeSegments(path)}`
  return `${API_ORIGIN}/media/${encodeSegments(path)}`
}
