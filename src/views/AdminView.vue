<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api, session } from '../api'

const users = ref([])
const challenges = ref([])
const tab = ref('challenges')
const notice = ref(null)
const saving = ref(false)
const checkFile = ref(null)
const fixFile = ref(null)
const emptyForm = () => ({ title: '', slug: '', description: '', category: 'Web', mode: 'ctf', difficulty: 'easy', points: 100, docker_image: '', internal_port: '', flag: '', status: 'published' })
const form = reactive(emptyForm())
const categories = computed(() => form.mode === 'awdp' ? ['Web', 'Pwn'] : ['Web', 'Pwn', 'Reverse', 'Misc', 'Crypto'])

watch(() => form.mode, () => {
  if (!categories.value.includes(form.category)) form.category = categories.value[0]
})
async function load() {
  try { [users.value, challenges.value] = await Promise.all([api('/users'), api('/challenges')]) }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function uploadScript(item, kind, file) {
  if (!file) return null
  const query = new URLSearchParams({ kind, filename: file.name })
  const result = await api(`/awdp/${item.id}/scripts?${query}`, {
    method: 'POST', body: await file.arrayBuffer(), headers: { 'Content-Type': 'application/octet-stream' },
  })
  item[kind === 'check_script' ? 'check_script_configured' : 'fix_script_configured'] = result.validation_status === 'valid'
  if (result.validation_status !== 'valid') throw new Error(`${kind === 'check_script' ? 'Check' : 'Fix'} 脚本校验失败：${result.validation_output}`)
  return result
}
async function createChallenge() {
  if (form.mode === 'awdp' && (!checkFile.value || !fixFile.value)) {
    notice.value = { error: true, text: 'AWDP 题目必须分别上传 Check 脚本和 Fix 脚本' }; return
  }
  saving.value = true; notice.value = null
  try {
    const desiredStatus = form.status
    const payload = {
      ...form, points: Number(form.points),
      internal_port: form.internal_port ? Number(form.internal_port) : null,
      docker_image: form.docker_image || null,
      status: form.mode === 'awdp' ? 'draft' : desiredStatus,
    }
    const created = await api('/challenges', { method: 'POST', body: payload })
    if (created.mode === 'awdp') {
      await uploadScript(created, 'check_script', checkFile.value)
      await uploadScript(created, 'fix_script', fixFile.value)
      if (desiredStatus === 'published') Object.assign(created, await api(`/challenges/${created.id}`, { method: 'PATCH', body: { status: 'published' } }))
    }
    challenges.value.push(created)
    Object.assign(form, emptyForm()); checkFile.value = null; fixFile.value = null
    notice.value = { text: `${created.mode.toUpperCase()} 题目创建成功` }
  } catch (err) { notice.value = { error: true, text: err.message }; await load() }
  finally { saving.value = false }
}
async function setStatus(item, status) {
  try { Object.assign(item, await api(`/challenges/${item.id}`, { method: 'PATCH', body: { status } })); notice.value = { text: status === 'published' ? '题目已上线' : '题目已下线' } }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function uploadAttachment(item, file) {
  if (!file) return
  try {
    const query = new URLSearchParams({ filename: file.name })
    await api(`/challenges/${item.id}/attachments?${query}`, { method: 'POST', body: await file.arrayBuffer(), headers: { 'Content-Type': 'application/octet-stream' } })
    notice.value = { text: `附件 ${file.name} 已添加到 ${item.title}` }
  } catch (err) { notice.value = { error: true, text: err.message } }
}
async function replaceScript(item, kind, file) {
  try { await uploadScript(item, kind, file); notice.value = { text: `${kind === 'check_script' ? 'Check' : 'Fix'} 脚本已更新并通过校验` } }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function deleteChallenge(item) {
  if (!window.confirm(`确定永久删除题目“${item.title}”吗？相关实例、提交和文件都会被删除。`)) return
  try { await api(`/challenges/${item.id}`, { method: 'DELETE' }); challenges.value = challenges.value.filter((challenge) => challenge.id !== item.id); notice.value = { text: '题目已删除' } }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function updateUser(user, changes) {
  try { Object.assign(user, await api(`/users/${user.id}`, { method: 'PATCH', body: changes })) }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function deleteUser(user) {
  if (!window.confirm(`确定删除成员“${user.username}”吗？该成员的提交、实例和补丁都会被删除。`)) return
  try { await api(`/users/${user.id}`, { method: 'DELETE' }); users.value = users.value.filter((item) => item.id !== user.id); notice.value = { text: '成员已删除' } }
  catch (err) { notice.value = { error: true, text: err.message } }
}
onMounted(load)
</script>

<template>
  <section>
    <div class="page-heading"><div><p class="eyebrow">CONTROL CENTER · ALPHA 0.0.1</p><h1>平台管理<span class="accent">.</span></h1><p class="lead">独立管理 CTF 与 AWDP 题目、成员和上线状态。</p></div></div>
    <div class="tabs admin-tabs"><button :class="{ active: tab === 'challenges' }" @click="tab = 'challenges'">题目管理</button><button :class="{ active: tab === 'users' }" @click="tab = 'users'">成员管理</button><button :class="{ active: tab === 'create' }" @click="tab = 'create'">＋ 上传题目</button></div>
    <p v-if="notice" :class="['alert', notice.error ? 'error' : 'success']">{{ notice.text }}</p>

    <div v-if="tab === 'challenges'" class="panel table-panel">
      <div class="data-row challenge-data data-head"><span>题目</span><span>模式 / 难度</span><span>分值</span><span>状态</span><span>操作</span></div>
      <div v-for="item in challenges" :key="item.id" class="data-row challenge-data">
        <span><b>{{ item.title }}</b><small>{{ item.category }} · {{ item.slug }}</small></span><span>{{ item.mode.toUpperCase() }} / {{ item.difficulty }}</span><span>{{ item.points }}</span><span><i :class="['status-pill', item.status]">{{ item.status === 'published' ? 'online' : 'offline' }}</i></span>
        <span class="row-actions"><label class="mini-upload">附件<input type="file" @change="uploadAttachment(item, $event.target.files[0]); $event.target.value = ''"></label><template v-if="item.mode === 'awdp'"><label :class="['mini-upload', { configured: item.check_script_configured }]">Check<input type="file" accept=".sh,text/x-shellscript" @change="replaceScript(item, 'check_script', $event.target.files[0]); $event.target.value = ''"></label><label :class="['mini-upload', { configured: item.fix_script_configured }]">Fix<input type="file" accept=".sh,text/x-shellscript" @change="replaceScript(item, 'fix_script', $event.target.files[0]); $event.target.value = ''"></label></template><button v-if="item.status !== 'published'" class="text-button" @click="setStatus(item, 'published')">上线</button><button v-else class="text-button" @click="setStatus(item, 'draft')">下线</button><button class="text-button danger" @click="deleteChallenge(item)">删除</button></span>
      </div>
    </div>

    <div v-if="tab === 'users'" class="panel table-panel">
      <div class="data-row user-data data-head"><span>成员</span><span>角色</span><span>状态</span><span>加入时间</span><span>操作</span></div>
      <div v-for="user in users" :key="user.id" class="data-row user-data"><span><b>{{ user.username }}</b><small>{{ user.id.slice(0, 8) }}</small></span><span><select :value="user.role" :disabled="user.id === session.user?.id" @change="updateUser(user, { role: $event.target.value })"><option value="player">选手</option><option value="admin">管理员</option></select></span><span><i :class="['status-pill', user.is_active ? 'published' : 'archived']">{{ user.is_active ? 'active' : 'disabled' }}</i></span><span>{{ new Date(user.created_at).toLocaleDateString('zh-CN') }}</span><span class="row-actions"><button class="text-button" :disabled="user.id === session.user?.id" @click="updateUser(user, { is_active: !user.is_active })">{{ user.is_active ? '禁用' : '启用' }}</button><button class="text-button danger" :disabled="user.id === session.user?.id" @click="deleteUser(user)">删除</button></span></div>
    </div>

    <form v-if="tab === 'create'" class="panel challenge-form" @submit.prevent="createChallenge">
      <div class="form-heading"><p class="eyebrow">UPLOAD TRAINING TARGET</p><h2>上传 {{ form.mode.toUpperCase() }} 题目</h2></div>
      <div class="mode-selector"><button type="button" :class="{ active: form.mode === 'ctf' }" @click="form.mode = 'ctf'">CTF 题目</button><button type="button" :class="{ active: form.mode === 'awdp' }" @click="form.mode = 'awdp'">AWDP 题目</button></div>
      <div class="form-grid"><label>题目名称<input v-model.trim="form.title" required minlength="2" placeholder="例如：SQL Garden"></label><label>唯一标识<input v-model.trim="form.slug" required pattern="[a-z0-9-]+" placeholder="sql-garden"></label><label>分类<select v-model="form.category"><option v-for="item in categories" :key="item">{{ item }}</option></select></label><label>难度<select v-model="form.difficulty"><option value="noob">Noob</option><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option><option value="insane">Insane</option></select></label><label>分值<input v-model.number="form.points" required type="number" min="1" max="10000"></label><label>初始状态<select v-model="form.status"><option value="draft">下线</option><option value="published">上线</option></select></label><label>Docker 镜像<input v-model.trim="form.docker_image" placeholder="nginx:alpine（可选）"></label><label>容器端口<input v-model.number="form.internal_port" type="number" min="1" max="65535" placeholder="80"></label><label class="span-2">题目说明<textarea v-model.trim="form.description" required minlength="10" rows="5" placeholder="描述目标、背景与任务…" /></label><label class="span-2">Flag<input v-model="form.flag" required minlength="3" placeholder="SYC{...}"></label>
        <template v-if="form.mode === 'awdp'"><label>Check 脚本<input required type="file" accept=".sh,text/x-shellscript" @change="checkFile = $event.target.files[0]"><small>部署补丁后自动执行，用于验证服务状态</small></label><label>Fix 脚本<input required type="file" accept=".sh,text/x-shellscript" @change="fixFile = $event.target.files[0]"><small>题目官方修复脚本，仅由管理员维护</small></label></template>
      </div><button class="primary" :disabled="saving">{{ saving ? '正在上传…' : `上传 ${form.mode.toUpperCase()} 题目 →` }}</button>
    </form>
  </section>
</template>
