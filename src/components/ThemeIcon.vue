<script setup>
import { computed } from 'vue'

const props = defineProps({
  category: { type: String, default: 'misc' },
  size: { type: [Number, String], default: 20 },
})

const kind = computed(() => String(props.category || 'misc').toLowerCase())
</script>

<template>
  <svg
    class="theme-icon"
    :class="`theme-icon-${kind}`"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="kind === 'web'">
      <circle cx="16" cy="16" r="12" />
      <path d="M4 16h24M16 4c3.1 3.3 4.7 7.3 4.7 12S19.1 24.7 16 28M16 4c-3.1 3.3-4.7 7.3-4.7 12S12.9 24.7 16 28M6.3 9.5h19.4M6.3 22.5h19.4" />
    </template>

    <template v-else-if="kind === 'pwn'">
      <path d="M16 8.5c-5.7 0-9.5 3.8-9.5 9.2 0 5.7 3.9 9.8 9.5 9.8s9.5-4.1 9.5-9.8c0-5.4-3.8-9.2-9.5-9.2Z" />
      <path d="M13 8.8c.4-2.6 1.4-4.1 3-5.1 1.3.7 2.3 1.7 2.7 3.5M18.5 5.1l2.2-1.4M18.9 8.2l2.8.4M16 14.5v5.5M13 17.5h6" />
    </template>

    <template v-else-if="kind === 'reverse'">
      <path d="M11 8.5A9.5 9.5 0 0 1 25 13l2.5-2.5M25 13v-5" />
      <path d="M21 23.5A9.5 9.5 0 0 1 7 19l-2.5 2.5M7 19v5" />
      <path d="m13 13-3 3 3 3M19 13l3 3-3 3" />
    </template>

    <template v-else-if="kind === 'crypto'">
      <rect x="5" y="13" width="22" height="15" rx="3" />
      <path d="M10 13V9a6 6 0 0 1 12 0v4" />
      <circle cx="16" cy="20" r="1.5" />
      <path d="M16 21.5v3" />
    </template>

    <template v-else-if="kind === 'all'">
      <circle cx="8" cy="8" r="3" />
      <circle cx="24" cy="8" r="3" />
      <circle cx="8" cy="24" r="3" />
      <circle cx="24" cy="24" r="3" />
      <path d="M11 8h10M8 11v10M24 11v10M11 24h10" />
    </template>

    <template v-else>
      <rect x="4" y="4" width="9" height="9" rx="2" />
      <rect x="19" y="4" width="9" height="9" rx="2" />
      <rect x="4" y="19" width="9" height="9" rx="2" />
      <path d="m23.5 18.5 1.2 3.1 3.3 1.2-3.3 1.2-1.2 3.1-1.2-3.1-3.3-1.2 3.3-1.2z" />
    </template>
  </svg>
</template>
