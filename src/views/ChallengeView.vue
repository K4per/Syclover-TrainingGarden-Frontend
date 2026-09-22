<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, downloadAsset, session } from '../api'
import ChallengeIntel from '../components/ChallengeIntel.vue'
import TagChips from '../components/TagChips.vue'

const route = useRoute()
const router = useRouter()
const challenge = ref(null)
const hints = ref([])
const instances = ref([])
const flag = ref('')
const busy = ref(false)
const notice = ref(null)
const starting = ref(false)
const startStep = ref(0)
const copied = ref('')
let pollTimer = null

const myInstances = computed(() => instances.value.filter((item) => item.challenge_id === route.params.id))
const activeInstance = computed(() => myInstances.value.find((item) => item.status === 'running'))
const failedInstance = computed(() => myInstances.value.find((item) => item.status === 'failed'))
const pendingInstance = computed(() => myInstances.value.find((item) => item.status === 'starting'))
const isWeb = computed(() => (challenge.value?.category || '').toLowerCase() === 'web')
const isAdmin = computed(() => session.user?.role === 'admin')
const connectCommand = computed(() => activeInstance.value?.connect_command
  || (activeInstance.value?.public_port ? `nc ${activeInstance.value.public_host} ${activeInstance.value.public_port}` : ''))
const accessUrl = computed(() => activeInstance.value?.access_url
  || (activeInstance.value?.public_port ? `http://${activeInstance.value.public_host}:${activeInstance.value.public_port}` : ''))
const startSteps = ['正在申请实例', '正在创建 Docker 容器', '正在等待服务监听', '环境就绪']

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function pollInstance(instanceId) {
  try {
    const value = await api(`/instances/${instanceId}`)
    const index = instances.value.findIndex((item) => item.id === value.id)
    if (index >= 0) instances.value.splice(index, 1, value)
    else instances.value.unshift(value)
    if (value.status === 'running') {
      startStep.value = 4
      starting.value = false
      stopPolling()
      notice.value = { text: '隔离环境已就绪' }
    } else if (value.status === 'failed') {
      starting.value = false
      stopPolling()
      notice.value = { error: true, text: value.error_message || '容器启动失败' }
    } else if (startStep.value < 3) {
      startStep.value += 1
    }
  } catch (err) {
    starting.value = false
    stopPolling()
    notice.value = { error: true, text: err.message }
  }
}

async function load() {
  try {
    ;[challenge.value, instances.value, hints.value] = await Promise.all([
      api(`/challenges/${route.params.id}`), api('/instances'), api(`/challenges/${route.params.id}/hints`),
    ])
    if (challenge.value.mode !== 'ctf') return router.replace(`/awdp/${challenge.value.id}`)
    if (pendingInstance.value) {
      starting.value = true
      startStep.value = 1
      pollTimer = setInterval(() => pollInstance(pendingInstance.value.id), 1000)
    }
  } catch (err) { notice.value = { error: true, text: err.message } }
}
async function start() {
  busy.value = true; notice.value = null; starting.value = true; startStep.value = 0
  try {
    const value = await api(`/instances/${challenge.value.id}`, { method: 'POST' })
    const index = instances.value.findIndex((item) => item.id === value.id)
    if (index >= 0) instances.value.splice(index, 1, value)
    else instances.value.unshift(value)
    startStep.value = value.status === 'running' ? 4 : 1
    if (value.status === 'running') {
      starting.value = false
      notice.value = { text: '隔离环境已就绪' }
    } else {
      stopPolling()
      pollTimer = setInterval(() => pollInstance(value.id), 1000)
    }
  } catch (err) {
    starting.value = false
    notice.value = { error: true, text: err.message }
  } finally { busy.value = false }
}
async function stop() {
  busy.value = true; stopPolling(); starting.value = false
  try {
    const target = activeInstance.value || pendingInstance.value
    await api(`/instances/${target.id}`, { method: 'DELETE' })
    await load(); notice.value = { text: '环境已销毁' }
  } catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function submit() {
  busy.value = true; notice.value = null
  try {
    const value = await api(`/challenges/${challenge.value.id}/submit`, { method: 'POST', body: { flag: flag.value } })
    notice.value = { error: !value.correct, spotlight: value.correct, text: `${value.message}${value.awarded_points ? `，获得 ${value.awarded_points} 分` : ''}` }
    if (value.correct) {
      flag.value = ''
      challenge.value = await api(`/challenges/${challenge.value.id}`)
    }
  } catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = label
    setTimeout(() => { copied.value = '' }, 1600)
  } catch { notice.value = { error: true, text: '浏览器拒绝了剪贴板访问，请手动复制' } }
}
async function download(asset) {
  try { await downloadAsset(asset) } catch (err) { notice.value = { error: true, text: err.message } }
}
onMounted(load)
onUnmounted(stopPolling)
</script>

<template>
  <section v-if="challenge">
    <RouterLink class="back-link" to="/ctf">← 返回 CTF 题库</RouterLink>
    <div :class="['challenge-hero', `theme-${challenge.category.toLowerCase()}`]">
      <div><div class="tag-row"><span :class="['mode-badge', challenge.mode]">{{ challenge.mode.toUpperCase() }}</span><span class="difficulty" :class="challenge.difficulty">{{ challenge.difficulty }}</span><span>{{ challenge.category }}</span></div><h1>{{ challenge.title }}<span class="accent">.</span></h1><p class="lead">展开 Markdown 详情、获取 Hints，并在隔离环境中完成挑战。</p><TagChips class="hero-tags" :tags="challenge.tags" /></div>
      <div class="point-orb"><strong>{{ challenge.points }}</strong><span>POINTS</span></div>
    </div>
    <ChallengeIntel :challenge="challenge" :hints="hints" />
    <p v-if="notice" role="status" :class="['alert', notice.error ? 'error' : 'success', { 'alert-spotlight': notice.spotlight }]">{{ notice.text }}<button v-if="notice.spotlight" class="text-button" aria-label="关闭成功提示" @click="notice = null">✕</button></p>
    <div class="two-column challenge-layout">
      <div>
        <article class="panel">
          <p class="eyebrow">TARGET ENVIRONMENT</p><h2>题目环境</h2>
          <template v-if="challenge.docker_image">
            <div v-if="starting || pendingInstance" class="instance-starting">
              <div class="start-head"><span class="spinner" /><b>正在启动隔离环境…</b><small>通常需要 3-20 秒</small></div>
              <ol class="start-steps">
                <li v-for="(step, index) in startSteps" :key="step" :class="{ done: startStep > index, active: startStep === index }">
                  <span class="dot" />{{ step }}
                </li>
              </ol>
            </div>
            <div v-else-if="activeInstance" class="instance-running"><span class="pulse" /><div><b>实例运行中</b><p>{{ activeInstance.listen_address || `${activeInstance.public_host}:${activeInstance.public_port}` }}</p></div></div>
            <div v-if="!starting && activeInstance" class="instance-access">
              <template v-if="isWeb">
                <a class="primary wide" :href="accessUrl" target="_blank" rel="noopener">打开题目地址 ↗</a>
                <div class="copy-row"><code>{{ accessUrl }}</code><button class="text-button" type="button" @click="copy(accessUrl, 'url')">{{ copied === 'url' ? '已复制' : '复制链接' }}</button></div>
              </template>
              <template v-else>
                <p class="access-hint">该题目是 TCP 服务，请在终端连接：</p>
                <div class="copy-row"><code>{{ connectCommand }}</code><button class="text-button" type="button" @click="copy(connectCommand, 'nc')">{{ copied === 'nc' ? '已复制' : '复制命令' }}</button></div>
              </template>
              <p class="access-note">若上面的地址无法连接，说明题目端口只对本机开放，请让管理员设置 <code>SYCL_INSTANCE_BIND_ADDRESS</code> 并放行端口。</p>
            </div>
            <div v-else-if="!starting" class="instance-empty"><div class="radar">◎</div><p>启动一个限时、隔离的 Docker 题目环境</p><button class="primary" :disabled="busy" @click="start">{{ busy ? '启动中…' : '启动环境' }}</button></div>
            <p v-if="failedInstance && !starting" class="alert error">上次启动失败：{{ failedInstance.error_message || '容器未能启动' }}</p>
            <div v-if="activeInstance && isAdmin && activeInstance.instance_flag" class="instance-flag admin-only"><b>本实例 Flag（仅管理员可见）</b><code>{{ activeInstance.instance_flag }}</code><p>选手端不会显示该值，必须从题目服务中自行取得。</p></div>
            <div v-if="activeInstance || pendingInstance" class="instance-actions"><span v-if="activeInstance">到期时间 {{ new Date(activeInstance.expires_at).toLocaleString('zh-CN') }}</span><span v-else>正在创建容器…</span><button class="danger text-button" :disabled="busy" @click="stop">销毁环境</button></div>
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
