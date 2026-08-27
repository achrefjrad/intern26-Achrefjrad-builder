export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "")

export const API_ENDPOINTS = {
  config: `${API_BASE_URL}/api/config/`,
  generate: `${API_BASE_URL}/api/generate/`,
  generateHomepage: `${API_BASE_URL}/api/generate-homepage/`,
  generateCatalog: `${API_BASE_URL}/api/generate-catalog/`,
  uploadImages: `${API_BASE_URL}/api/upload-images/`,
  projects: `${API_BASE_URL}/api/projects/`,
  projectDetail: (name: string) => `${API_BASE_URL}/api/projects/${encodeURIComponent(name)}/`,
  orders: `${API_BASE_URL}/api/orders/`,
  chat: `${API_BASE_URL}/api/chat/`,
}
