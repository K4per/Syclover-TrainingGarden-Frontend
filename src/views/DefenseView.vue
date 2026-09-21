<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, downloadAsset } from '../api'

const route = useRoute()
const router = useRouter()
const challenge = ref(null)
const instances = ref([])
const assets = ref([])
const events = ref([])
const patchFile = ref(null)
const flag = ref('')
const busy = ref(false)
const notice = ref(null)
const activeInstance = computed(() => instances.value.find((item) => item.challenge_id === route.params.id && item.status === 'running'))
const challengeAssets = computed(() => assets.value.filter((item) => item.challenge_id === route.params.id))

async function load() {
  try {
    ;[challenge.value, instances.value, assets.value] = await Promise.all([
      api(`/challenges/${route.params.id}`), api('/instances'), api('/awdp/assets'),
    ])
    if (challenge.value.mode !== 'awdp') return router.replace(`/ctf/${challenge.value.id}`)
    if (activeInstance.value) await loadEvents()
  } catch (err) { notice.value = { error: true, text: err.message } }
}
async function start() {
  busy.value = true; notice.value = null
  try {
    const value = await api(`/instances/${challenge.value.id}`, { method: 'POST' })
    instances.value.unshift(value); notice.value = { text: 'AWDP 隔离环境已启动' }
  } catch (err) { notice.value = { error: true, text: err.message } }
  finally { busy.value = false }
}
async function stop() {
  busy.value = true
  try { await api(`/instances/${activeInstance.value.id}`, { method: 'DELETE' }); await load(); notice.value = { text: '环境已销毁' } }
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
    events.value.unshift(value); notice.value = { error: !value.success, text: value.output }
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
    <RouterLink class="back-link" to="/awdp">← 返回 AWDP 题库</RouterLink>
    <div class="challenge-hero">
      <div><div class="tag-row"><span class="mode-badge awdp">AWDP</span><span :class="['difficulty', challenge.difficulty]">{{ challenge.difficulty }}</span><span>{{ challenge.category }}</span></div><h1>{{ challenge.title }}<span class="accent">.</span></h1><p class="lead">{{ challenge.description }}</p></div>
      <div class="point-orb"><strong>{{ challenge.points }}</strong><span>POINTS</span></div>
    </div>
    <p v-if="notice" :class="['alert', notice.error ? 'error' : 'success']">{{ notice.text }}</p>
    <div class="two-column challenge-layout">
      <div>
        <article class="panel"><p class="eyebrow">AWDP TARGET</p><h2>攻防环境</h2>
          <div v-if="activeInstance" class="instance-running"><span class="pulse" /><div><b>实例运行中</b><p>{{ activeInstance.public_host }}:{{ activeInstance.public_port }}</p></div><a class="secondary" :href="`http://${activeInstance.public_host}:${activeInstance.public_port}`" target="_blank">访问目标 ↗</a></div>
          <div v-else class="instance-empty"><div class="radar">◎</div><p>启动隔离环境后进行攻击验证与补丁部署</p><button class="primary" :disabled="busy" @click="start">启动 AWDP 环境</button></div>
          <div v-if="activeInstance" class="instance-actions"><span>到期时间 {{ new Date(activeInstance.expires_at).toLocaleString('zh-CN') }}</span><button class="danger text-button" :disabled="busy" @click="stop">销毁环境</button></div>
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
