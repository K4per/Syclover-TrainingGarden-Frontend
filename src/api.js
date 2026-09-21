import { reactive } from 'vue'

const SESSION_KEY = 'syclover-session-v2'
localStorage.removeItem('syclover-session')
let savedSession = { token: '', user: null }
try {
  const saved = localStorage.getItem(SESSION_KEY)
  if (saved) savedSession = JSON.parse(saved)
} catch {
  localStorage.removeItem(SESSION_KEY)
}
export const session = reactive(savedSession)

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

export function setSession(data) {
  session.token = data.access_token
  session.user = data.user
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, user: session.user }))
}

export function clearSession() {
  session.token = ''
  session.user = null
  localStorage.removeItem(SESSION_KEY)
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`)
  const isBinary = options.body instanceof Blob || options.body instanceof ArrayBuffer || ArrayBuffer.isView(options.body)
  if (options.body && !isBinary && typeof options.body !== 'string') {
    headers.set('Content-Type', 'application/json')
    options = { ...options, body: JSON.stringify(options.body) }
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (response.status === 401) clearSession()
  if (!response.ok) {
    let message = `请求失败 (${response.status})`
    try {
      const payload = await response.json()
      message = payload.detail || message
      if (Array.isArray(message)) message = message.map((item) => item.msg).join('；')
    } catch { /* keep the fallback */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

export async function downloadAsset(asset) {
  const headers = session.token ? { Authorization: `Bearer ${session.token}` } : {}
  const response = await fetch(asset.download_url, { headers })
  if (!response.ok) throw new Error('附件下载失败')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = asset.original_name
  link.click()
  URL.revokeObjectURL(url)
}
