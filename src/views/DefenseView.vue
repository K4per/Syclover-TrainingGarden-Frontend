<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, downloadAsset } from '../api'
import ChallengeIntel from '../components/ChallengeIntel.vue'
import TagChips from '../components/TagChips.vue'
import ThemeIcon from '../components/ThemeIcon.vue'

const route = useRoute()
const router = useRouter()
const challenge = ref(null)
const instances = ref([])
const assets = ref([])
const events = ref([])
const hints = ref([])
const patchFile = ref(null)
const flag = ref('')
const busy = ref(false)
const notice = ref(null)
const activeInstance = computed(() => instances.value.find((item) => item.challenge_id === route.params.id && item.status === 'running'))
const pendingInstance = computed(() => instances.value.find((item) => item.challenge_id === route.params.id && item.status === 'starting'))
const starting = ref(false)
const startStep = ref(0)
const copied = ref('')
const startSteps = ['正在申请实例', '正在创建 Docker 容器', '正在等待服务监听', '环境就绪']
let pollTimer = null

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
      startStep.value = 4; starting.value = false; stopPolling(); notice.value = { text: 'AWDP 环境已就绪' }
      await loadEvents()
    } else if (value.status === 'failed') {
      starting.value = false; stopPolling()
      notice.value = { error: true, text: value.error_message || '容器启动失败' }
    } else if (startStep.value < 3) startStep.value += 1
  } catch (err) { starting.value = false; stopPolling(); notice.value = { error: true, text: err.message } }
}
async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = label
    setTimeout(() => { copied.value = '' }, 1600)
  } catch { notice.value = { error: true, text: '浏览器拒绝了剪贴板访问，请手动复制' } }
}
const challengeAssets = computed(() => assets.value.filter((item) => item.challenge_id === route.params.id))

async function load() {
  try {
    ;[challenge.value, instances.value, assets.value, hints.value] = await Promise.all([
      api(`/challenges/${route.params.id}`), api('/instances'), api('/awdp/assets'),
      api(`/challenges/${route.params.id}/hints`),
    ])
    if (challenge.value.mode !== 'awdp') return router.replace(`/ctf/${challenge.value.id}`)
    if (activeInstance.value) await loadEvents()
  } catch (err) { notice.value = { error: true, text: err.message } }
}
async function start() {
  busy.value = true; notice.value = null; starting.value = true; startStep.value = 0
  try {
    const value = await api(`/instances/${challenge.value.id}`, { method: 'POST' })
    instances.value.unshift(value)
    if (value.status === 'running') {
      starting.value = false; startStep.value = 4; notice.value = { text: 'AWDP 隔离环境已启动' }
    } else {
      startStep.value = 1
      stopPolling()
      pollTimer = setInterval(() => pollInstance(value.id), 1000)
    }
  } catch (err) { starting.value = false; notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function stop() {
  busy.value = true; stopPolling(); starting.value = false
  try {
    const target = activeInstance.value || pendingInstance.value
    await api(`/instances/${target.id}`, { method: 'DELETE' }); await load(); notice.value = { text: '环境已销毁' } }
  catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function uploadPatch() {
  if (!patchFile.value) return
  busy.value = true; notice.value = null
  try {
    const query = new URLSearchParams({ kind: 'patch', filename: patchFile.value.name })
    const item = await api(`/awdp/${challenge.value.id}/assets?${query}`, {
      method: 'POST', body: await patchFile.value.arrayBuffer(),
      headers: { 'Content-Type': 'application/octet-stream' },
    })
    assets.value.unshift(item)
    notice.value = { error: item.validation_status !== 'valid', text: item.validation_output }
    patchFile.value = null
  } catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function deploy(asset) {
  if (!activeInstance.value) { notice.value = { error: true, text: '请先启动题目环境' }; return }
  busy.value = true
  try {
    const value = await api(`/awdp/instances/${activeInstance.value.id}/deploy/${asset.id}`, { method: 'POST' })
    events.value.unshift(value); notice.value = { error: !value.success, spotlight: value.success, text: value.success ? `✓ Fix 部署成功！${value.output || ''}` : value.output }
    if (value.success) challenge.value = await api(`/challenges/${challenge.value.id}`)
  } catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function loadEvents() {
  if (activeInstance.value) events.value = await api(`/awdp/instances/${activeInstance.value.id}/events`)
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
async function download(asset) {
  try { await downloadAsset(asset) } catch (err) { notice.value = { error: true, text: err.message } }
}
onMounted(load)
onUnmounted(stopPolling)
</script>

<template>
  <section v-if="challenge">
    <RouterLink class="back-link" to="/awdp">← 返回 AWDP 题库</RouterLink>
    <div :class="['challenge-hero', `theme-${challenge.category.toLowerCase()}`]">
      <div><div class="tag-row"><span class="mode-badge awdp">AWDP</span><span :class="['difficulty', challenge.difficulty]">{{ challenge.difficulty }}</span><span class="theme-category"><ThemeIcon :category="challenge.category" :size="17" />{{ challenge.category }}</span></div><h1>{{ challenge.title }}<span class="accent">.</span></h1><p class="lead">攻击与防御独立记录 Solves 和前三血。</p><TagChips class="hero-tags" :tags="challenge.tags" /></div>
      <div class="point-orb"><strong>{{ challenge.points }}</strong><span>POINTS</span></div>
    </div>
    <ChallengeIntel :challenge="challenge" :hints="hints" />
    <p v-if="notice" role="status" :class="['alert', notice.error ? 'error' : 'success', { 'alert-spotlight': notice.spotlight }]">{{ notice.text }}<button v-if="notice.spotlight" class="text-button" aria-label="关闭成功提示" @click="notice = null">✕</button></p>
    <div class="two-column challenge-layout">
      <div>
        <article class="panel"><p class="eyebrow">AWDP TARGET</p><h2>攻防环境</h2>
          <div v-if="starting || pendingInstance" class="instance-starting">
            <div class="start-head"><span class="spinner" /><b>正在启动 AWDP 环境…</b><small>通常需要 3-20 秒</small></div>
            <ol class="start-steps"><li v-for="(step, index) in startSteps" :key="step" :class="{ done: startStep > index, active: startStep === index }"><span class="dot" />{{ step }}</li></ol>
          </div>
          <div v-else-if="activeInstance" class="instance-running"><span class="pulse" /><div><b>实例运行中</b><p>{{ activeInstance.listen_address || `${activeInstance.public_host}:${activeInstance.public_port}` }}</p></div></div>
          <div v-if="!starting && activeInstance" class="instance-access">
            <a class="primary wide" :href="activeInstance.access_url" target="_blank" rel="noopener">打开服务地址 ↗</a>
            <div class="copy-row"><code>{{ activeInstance.access_url }}</code><button class="text-button" type="button" @click="copy(activeInstance.access_url, 'url')">{{ copied === 'url' ? '已复制' : '复制链接' }}</button></div>
            <div class="copy-row"><code>{{ activeInstance.connect_command }}</code><button class="text-button" type="button" @click="copy(activeInstance.connect_command, 'nc')">{{ copied === 'nc' ? '已复制' : '复制 nc' }}</button></div>
          </div>
          <div v-else-if="!starting" class="instance-empty"><div class="radar">◎</div><p>启动隔离环境后进行攻击验证与补丁部署</p><button class="primary" :disabled="busy" @click="start">启动 AWDP 环境</button></div>
          <div v-if="activeInstance || pendingInstance" class="instance-actions"><span v-if="activeInstance">到期时间 {{ new Date(activeInstance.expires_at).toLocaleString('zh-CN') }}</span><span v-else>正在创建容器…</span><button class="danger text-button" :disabled="busy" @click="stop">销毁环境</button></div>
        </article>
        <article class="panel attachments"><p class="eyebrow">RESOURCES</p><h2>题目附件</h2><div v-if="!challenge.attachments.length" class="empty">没有题目附件</div><button v-for="asset in challenge.attachments" :key="asset.id" class="file-row" @click="download(asset)"><span>↓</span><span class="grow"><b>{{ asset.original_name }}</b><small>{{ (asset.size_bytes / 1024).toFixed(1) }} KB</small></span><span>下载</span></button></article>
        <article class="panel"><p class="eyebrow">ATTACK FLAG</p><h2>攻击验证</h2><form class="inline-form" @submit.prevent="submit"><input v-model.trim="flag" required placeholder="SYC{...}" autocomplete="off"><button class="primary" :disabled="busy">提交 Flag</button></form><div v-if="challenge.solved" class="solved-stamp">✓<b>ATTACK VERIFIED</b><span>攻击侧 Flag 已完成</span></div></article>
      </div>
      <aside class="panel submit-panel"><p class="eyebrow">PATCH &amp; AUTO CHECK</p><h2>防御补丁</h2><p class="muted">这里只提交 unified diff 补丁。平台会在部署后自动执行管理员配置的 Check 脚本；Fix 脚本由管理员在上传题目时单独维护。</p>
        <label class="drop-zone"><input type="file" accept=".patch,.diff,text/plain" @change="patchFile = $event.target.files[0]"><span>＋</span><b>{{ patchFile?.name || '选择 Patch 文件' }}</b><small>支持 .patch / .diff unified diff</small></label><button class="primary wide" :disabled="busy || !patchFile" @click="uploadPatch">上传并校验</button>
        <div v-if="!challengeAssets.length" class="empty compact-empty">暂无已上传补丁</div><div v-for="asset in challengeAssets" :key="asset.id" class="asset-row"><span :class="['validation-dot', asset.validation_status]" /><span class="grow"><b>{{ asset.original_name }}</b><small>{{ asset.validation_status }}</small></span><button class="secondary" :disabled="asset.validation_status !== 'valid' || busy || !activeInstance" @click="deploy(asset)">部署</button></div>
        <div v-if="events.length" class="log-box"><div v-for="event in events" :key="event.id"><span>{{ event.success ? '[PASS]' : '[FAIL]' }}</span> {{ event.output }}</div></div>
      </aside>
    </div>
  </section>
  <div v-else class="empty">正在读取 AWDP 题目…</div>
</template>
