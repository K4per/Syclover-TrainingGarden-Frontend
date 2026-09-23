import { reactive } from 'vue'

export const notifications = reactive({ history: [], active: null, open: false })
let nextId = 0
let timer = null

export function notify(text, type = 'info') {
  const item = { id: ++nextId, text: String(text), type, time: new Date().toISOString() }
  notifications.history.unshift(item)
  notifications.history.splice(50)
  notifications.active = item
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    if (notifications.active?.id === item.id) notifications.active = null
  }, 4300)
  return item
}

export function dismissNotification() {
  notifications.active = null
  if (timer) clearTimeout(timer)
}
