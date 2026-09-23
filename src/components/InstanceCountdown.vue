<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({ expiresAt: { type: String, required: true }, busy: Boolean })
const emit = defineEmits(['extend', 'expired'])
const now = ref(Date.now())
const seconds = computed(() => Math.max(0, Math.ceil((Date.parse(props.expiresAt) - now.value) / 1000)))
const display = computed(() => {
  if (!Number.isFinite(seconds.value)) return '—'
  const hours = Math.floor(seconds.value / 3600)
  const minutes = Math.floor((seconds.value % 3600) / 60)
  const remainder = seconds.value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
})
let timer = null
let reportedExpiry = null

watch(() => [props.expiresAt, seconds.value, props.busy], () => {
  if (seconds.value === 0 && !props.busy && reportedExpiry !== props.expiresAt) {
    reportedExpiry = props.expiresAt
    emit('expired')
  }
}, { immediate: true })
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="instance-countdown">
    <div class="instance-time"><span>剩余时间 <strong>{{ display }}</strong></span><small>到期 {{ new Date(expiresAt).toLocaleString('zh-CN') }}</small></div>
    <button class="secondary" type="button" :disabled="busy || seconds === 0" @click="emit('extend')">延长 30 分钟</button>
  </div>
</template>
