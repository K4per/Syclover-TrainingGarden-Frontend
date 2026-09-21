<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, downloadAsset } from '../api'

const route = useRoute()
const router = useRouter()
const challenge = ref(null)
const instances = ref([])
const flag = ref('')
const busy = ref(false)
const notice = ref(null)
const activeInstance = computed(() => instances.value.find((item) => item.challenge_id === route.params.id && item.status === 'running'))

async function load() {
  try {
    ;[challenge.value, instances.value] = await Promise.all([api(`/challenges/${route.params.id}`), api('/instances')])
    if (challenge.value.mode !== 'ctf') return router.replace(`/awdp/${challenge.value.id}`)
  } catch (err) { notice.value = { error: true, text: err.message } }
}
async function start() {
  busy.value = true; notice.value = null
  try { const value = await api(`/instances/${challenge.value.id}`, { method: 'POST' }); instances.value.unshift(value); notice.value = { text: '隔离环境启动成功' } }
  catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function stop() {
  busy.value = true
  try { await api(`/instances/${activeInstance.value.id}`, { method: 'DELETE' }); await load(); notice.value = { text: '环境已销毁' } }
  catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function submit() {
  busy.value = true; notice.value = null
  try {
    const value = await api(`/challenges/${challenge.value.id}/submit`, { method: 'POST', body: { flag: flag.value } })
    notice.value = { error: !value.correct, text: `${value.message}${value.awarded_points ? `，获得 ${value.awarded_points} 分` : ''}` }
    if (value.correct) { challenge.value.solved = true; flag.value = '' }
  } catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function download(asset) {
  try { await downloadAsset(asset) } catch (err) { notice.value = { error: true, text: err.message } }
}
onMounted(load)
</script>

<template>
  <section v-if="challenge">
    <RouterLink class="back-link" to="/ctf">← 返回 CTF 题库</RouterLink>
    <div class="challenge-hero">
      <div><div class="tag-row"><span :class="['mode-badge', challenge.mode]">{{ challenge.mode.toUpperCase() }}</span><span class="difficulty" :class="challenge.difficulty">{{ challenge.difficulty }}</span><span>{{ challenge.category }}</span></div><h1>{{ challenge.title }}<span class="accent">.</span></h1><p class="lead">{{ challenge.description }}</p></div>
      <div class="point-orb"><strong>{{ challenge.points }}</strong><span>POINTS</span></div>
    </div>
    <p v-if="notice" :class="['alert', notice.error ? 'error' : 'success']">{{ notice.text }}</p>
    <div class="two-column challenge-layout">
      <div>
        <article class="panel">
          <p class="eyebrow">TARGET ENVIRONMENT</p><h2>题目环境</h2>
          <template v-if="challenge.docker_image">
            <div v-if="activeInstance" class="instance-running"><span class="pulse" /><div><b>实例运行中</b><p>{{ activeInstance.public_host }}:{{ activeInstance.public_port }}</p></div><a class="secondary" :href="`http://${activeInstance.public_host}:${activeInstance.public_port}`" target="_blank">访问目标 ↗</a></div>
            <div v-else class="instance-empty"><div class="radar">◎</div><p>启动一个限时、隔离的 Docker 题目环境</p><button class="primary" :disabled="busy" @click="start">{{ busy ? '启动中…' : '启动环境' }}</button></div>
            <div v-if="activeInstance" class="instance-actions"><span>到期时间 {{ new Date(activeInstance.expires_at).toLocaleString('zh-CN') }}</span><button class="danger text-button" :disabled="busy" @click="stop">销毁环境</button></div>
          </template>
          <div v-else class="empty">该题目无需启动独立环境，请结合附件完成。</div>
        </article>
        <article class="panel attachments"><p class="eyebrow">RESOURCES</p><h2>题目附件</h2><div v-if="!challenge.attachments.length" class="empty">没有题目附件</div><button v-for="asset in challenge.attachments" :key="asset.id" class="file-row" @click="download(asset)"><span>↓</span><span class="grow"><b>{{ asset.original_name }}</b><small>{{ (asset.size_bytes / 1024).toFixed(1) }} KB</small></span><span>下载</span></button></article>
      </div>
      <aside class="panel submit-panel"><p class="eyebrow">FLAG VALIDATION</p><h2>提交 Flag</h2><p class="muted">找到目标中的 Flag 后在这里验证。每道题仅首次解出计分。</p><form @submit.prevent="submit"><input v-model.trim="flag" required placeholder="SYC{...}" autocomplete="off"><button class="primary wide" :disabled="busy">验证 Flag →</button></form><div v-if="challenge.solved" class="solved-stamp">✓<b>CHALLENGE CLEARED</b><span>你已完成该题目</span></div><div class="tip"><b>提示</b><p>遇到困难时，先收集信息、缩小攻击面，再验证每一个假设。</p></div></aside>
    </div>
  </section>
  <div v-else class="empty">正在读取题目…</div>
</template>
