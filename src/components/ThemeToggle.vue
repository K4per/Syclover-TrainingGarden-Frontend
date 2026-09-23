<script setup>
import { theme, toggleTheme } from '../theme'
</script>

<template>
  <button class="theme-toggle" type="button" :aria-label="theme === 'dark' ? '切换到日间主题' : '切换到夜间主题'" :aria-pressed="theme === 'light'" @click="toggleTheme">
    <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.3A8.5 8.5 0 0 1 8.7 3.6 8.5 8.5 0 1 0 20.4 15.3Z" /></svg>
    <span>{{ theme === 'dark' ? '日间' : '夜间' }}</span>
  </button>
</template>
