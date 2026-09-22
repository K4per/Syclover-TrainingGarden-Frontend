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
      <rect x="3.5" y="4.5" width="25" height="23" rx="4" />
      <path d="M4 10.5h24" />
      <circle cx="8" cy="7.5" r=".8" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.5" r=".8" fill="currentColor" stroke="none" />
      <path d="m10 17 3 3-3 3M16 23h6" />
    </template>

    <template v-else-if="kind === 'pwn'">
      <rect x="3.5" y="4.5" width="25" height="23" rx="4" />
      <path d="M4 10.5h24M9 16l3 3-3 3M16 22h5" />
      <path d="M22.5 14.5v-1.3M25.5 14.5v-1.3M20.5 17.5c.8-1.3 4.2-1.3 5 0v3.2c0 1.7-1.1 2.8-2.5 2.8s-2.5-1.1-2.5-2.8z" />
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
