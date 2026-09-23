import { ref, watch } from 'vue'

const storageKey = 'syclover-theme'
let savedTheme = 'dark'
try {
  savedTheme = localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'
} catch {
  // Private browsing can disable storage; the theme still works for this visit.
}

export const theme = ref(savedTheme)

watch(theme, (value) => {
  document.documentElement.dataset.theme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'light' ? '#f5f8f3' : '#07140f')
  try {
    localStorage.setItem(storageKey, value)
  } catch {
    // Keep the in-memory choice when storage is unavailable.
  }
}, { immediate: true })

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
