<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { api, session } from '../api'
import TagChips from '../components/TagChips.vue'

const users = ref([])
const challenges = ref([])
const tagCatalog = ref([])
const tab = ref('challenges')
const notice = ref(null)
const saving = ref(false)
const buildPanel = reactive({ active: false, challenge: null, status: 'building', log: '', cursor: 0, percent: 0 })
let buildTimer = null
const progressTimers = new Map()
const tagEditor = ref(null)
const tagDraft = reactive({ name: '', description: '' })
const tagCreator = reactive({ open: false, name: '', description: '' })
const challengeTagEditor = ref(null)
const challengeTagDraft = ref([])
const challengeTagDraftInput = ref('')
const checkFile = ref(null)
const fixFile = ref(null)
const buildFile = ref(null)
const hintChallenge = ref(null)
const hints = ref([])
const hintForm = reactive({ title: '', content: '', status: 'draft' })
const emptyForm = () => ({ title: '', slug: '', description: '', category: 'Web', mode: 'ctf', difficulty: 'easy', points: 100, docker_image: '', internal_port: '', flag: '', dynamic_flag: false, status: 'published', tags: [] })
const form = reactive(emptyForm())
const categories = computed(() => form.mode === 'awdp' ? ['Web', 'Pwn'] : ['Web', 'Pwn', 'Reverse', 'Misc', 'Crypto'])

watch(() => form.mode, () => {
  if (!categories.value.includes(form.category)) form.category = categories.value[0]
})
const topicTags = computed(() => tagCatalog.value.filter((entry) => entry.kind === 'topic'))
const tagLabel = (name) => ({ dynamic: '动态', static: '静态', web: 'Web', pwn: 'Pwn', reverse: 'Reverse', crypto: 'Crypto', misc: 'Misc' }[name] || name)

async function load() {
  try {
    ;[users.value, challenges.value, tagCatalog.value] = await Promise.all([
      api('/users'), api('/challenges'), api('/challenges/tags/catalog'),
    ])
  } catch (err) { notice.value = { error: true, text: err.message } }
}

function toggleDynamicFlag() {
  form.dynamic_flag = !form.dynamic_flag
  if (form.dynamic_flag && !form.flag.includes('RAND')) {
    const match = form.flag.match(/^([A-Za-z0-9_]{2,16})\{/)
    form.flag = match ? `${match[1]}{RAND}` : 'SYC{RAND}'
  }
  if (!form.dynamic_flag) form.flag = form.flag.replace('RAND', 'training')
}

function toggleFormTag(name) {
  const index = form.tags.indexOf(name)
  if (index >= 0) form.tags.splice(index, 1)
  else form.tags.push(name)
}

function openChallengeTags(item) {
  challengeTagEditor.value = item
  challengeTagDraft.value = (item.tags || []).filter((tag) => tag !== 'dynamic' && tag !== 'static')
}

function toggleChallengeTag(name) {
  const index = challengeTagDraft.value.indexOf(name)
  if (index >= 0) challengeTagDraft.value.splice(index, 1)
  else challengeTagDraft.value.push(name)
}

function addCustomChallengeTag() {
  const value = challengeTagDraftInput.value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '')
  if (!value) return
  if (value !== 'dynamic' && value !== 'static' && !challengeTagDraft.value.includes(value)) {
    challengeTagDraft.value.push(value)
  }
  challengeTagDraftInput.value = ''
}

async function saveChallengeTags() {
  if (!challengeTagEditor.value) return
  try {
    const updated = await api(`/challenges/${challengeTagEditor.value.id}`, {
      method: 'PATCH', body: { tags: challengeTagDraft.value },
    })
    Object.assign(challengeTagEditor.value, updated)
    challengeTagEditor.value = null
    tagCatalog.value = await api('/challenges/tags/catalog')
    notice.value = { text: '题目标签已更新' }
  } catch (err) { notice.value = { error: true, text: err.message } }
}

function openTagCreator() {
  tagCreator.open = true
  tagCreator.name = ''
  tagCreator.description = ''
}

async function createTag() {
  try {
    await api('/challenges/tags', {
      method: 'POST',
      body: { name: tagCreator.name, description: tagCreator.description || null },
    })
    tagCreator.open = false
    tagCreator.name = ''
    tagCreator.description = ''
    tagCatalog.value = await api('/challenges/tags/catalog')
    notice.value = { text: '标签已创建，可在题目上选用' }
  } catch (err) { notice.value = { error: true, text: err.message } }
}

function startTagEdit(entry) {
  tagEditor.value = entry
  tagDraft.name = entry.name
  tagDraft.description = entry.description || ''
}

async function saveTag() {
  if (!tagEditor.value) return
  try {
    await api(`/challenges/tags/${tagEditor.value.id}`, {
      method: 'PATCH', body: { name: tagDraft.name, description: tagDraft.description },
    })
    tagEditor.value = null
    tagCatalog.value = await api('/challenges/tags/catalog')
    challenges.value = await api('/challenges')
    notice.value = { text: '标签已更新' }
  } catch (err) { notice.value = { error: true, text: err.message } }
}

async function deleteTag(entry) {
  if (!window.confirm(`确定删除标签“${tagLabel(entry.name)}”吗？题目上的该标签会一并移除。`)) return
  try {
    await api(`/challenges/tags/${entry.id}`, { method: 'DELETE' })
    tagCatalog.value = await api('/challenges/tags/catalog')
    challenges.value = await api('/challenges')
    notice.value = { text: '标签已删除' }
  } catch (err) { notice.value = { error: true, text: err.message } }
}

function resetBuildProgress(item) {
  item.build_progress = { status: 'building', percent: 0, log: '' }
  if (progressTimers.get(item.id)) clearInterval(progressTimers.get(item.id))
  const timer = setInterval(async () => {
    try {
      const result = await api(`/challenges/${item.id}/build/progress?cursor=${item.build_progress.cursor || 0}`)
      item.build_progress.cursor = result.cursor
      item.build_progress.percent = result.percent ?? item.build_progress.percent
      item.build_progress.status = result.status
      if (result.data) item.build_progress.log += result.data
      if (result.finished) {
        clearInterval(timer)
        progressTimers.delete(item.id)
        item.build_progress.percent = 100
        const detail = await api(`/challenges/${item.id}`)
        Object.assign(item, detail)
      }
    } catch {
      clearInterval(timer)
      progressTimers.delete(item.id)
    }
  }, 800)
  progressTimers.set(item.id, timer)
}

function stopBuildWatch() {
  if (buildTimer) { clearInterval(buildTimer); buildTimer = null }
}

async function pollBuildLog() {
  if (!buildPanel.challenge) return
  try {
    const result = await api(`/challenges/${buildPanel.challenge.id}/build/progress?cursor=${buildPanel.cursor}`)
    if (result.data) buildPanel.log += result.data
    buildPanel.cursor = result.cursor
    buildPanel.status = result.status
    buildPanel.percent = result.percent ?? buildPanel.percent
    if (result.finished) {
      buildPanel.percent = 100
      stopBuildWatch()
      const item = buildPanel.challenge
      const detail = await api(`/challenges/${item.id}`)
      Object.assign(item, detail)
      if (result.status === 'success') {
        notice.value = { error: Boolean(result.port_warning), text: result.port_warning ? `镜像构建成功，但端口需要确认：${result.port_warning}` : `镜像构建成功：${detail.docker_image}` }
      } else {
        notice.value = { error: true, text: '镜像构建失败，详情见构建日志' }
      }
    }
  } catch (err) {
    stopBuildWatch()
    notice.value = { error: true, text: err.message }
  }
}

function watchBuild(item) {
  buildPanel.active = true
  buildPanel.challenge = item
  buildPanel.status = 'building'
  buildPanel.log = ''
  buildPanel.cursor = 0
  buildPanel.percent = 2
  stopBuildWatch()
  buildTimer = setInterval(pollBuildLog, 700)
  pollBuildLog()
}

function closeBuildPanel() {
  stopBuildWatch()
  buildPanel.active = false
  buildPanel.challenge = null
}
onUnmounted(() => {
  stopBuildWatch()
  progressTimers.forEach((timer) => clearInterval(timer))
  progressTimers.clear()
})
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
async function uploadBuild(item, file, { showPanel = false } = {}) {
  if (!file) return null
  const query = new URLSearchParams({ filename: file.name })
  item.build_status = 'building'
  if (showPanel) watchBuild(item)
  else resetBuildProgress(item)
  try {
    const result = await api(`/challenges/${item.id}/build?${query}`, {
      method: 'POST', body: await file.arrayBuffer(), headers: { 'Content-Type': 'application/zip' },
    })
    item.docker_image = result.image; item.internal_port = result.internal_port
    item.detected_port = result.detected_port
    item.build_status = result.status; item.build_output = result.output
    if (buildPanel.challenge?.id === item.id) {
      if (!buildPanel.log) buildPanel.log = result.output
      buildPanel.percent = 100
      stopBuildWatch()
    }
    return result
  } catch (err) {
    item.build_status = 'failed'
    throw err
  }
}
async function createChallenge() {
  if (form.mode === 'awdp' && (!checkFile.value || !fixFile.value)) {
    notice.value = { error: true, text: 'AWDP 题目必须分别上传 Check 脚本和 Fix 脚本' }; return
  }
  saving.value = true; notice.value = null
  try {
    const desiredStatus = form.status
    const payload = {
      ...form, points: Number(form.points), tags: [...form.tags], dynamic_flag: form.dynamic_flag,
      internal_port: form.internal_port ? Number(form.internal_port) : null,
      docker_image: form.docker_image || null,
      status: (form.mode === 'awdp' || buildFile.value) ? 'draft' : desiredStatus,
    }
    const created = await api('/challenges', { method: 'POST', body: payload })
    let buildSummary = ''
    if (buildFile.value) {
      // The upload form only registers the archive; progress and logs belong to the
      // challenge management view so a build can be watched from anywhere.
      closeBuildPanel()
      const built = await uploadBuild(created, buildFile.value)
      buildSummary = built?.port_warning
        ? `；镜像已构建，但端口需要确认：${built.port_warning}`
        : `；镜像 ${built?.image || ''} 构建成功`
    }
    if (created.mode === 'awdp') {
      await uploadScript(created, 'check_script', checkFile.value)
      await uploadScript(created, 'fix_script', fixFile.value)
    }
    if (desiredStatus === 'published' && created.status !== 'published') Object.assign(created, await api(`/challenges/${created.id}`, { method: 'PATCH', body: { status: 'published' } }))
    challenges.value.push(created)
    Object.assign(form, emptyForm()); checkFile.value = null; fixFile.value = null; buildFile.value = null
    notice.value = {
      error: Boolean(buildSummary.includes('端口需要确认')),
      text: `${created.mode.toUpperCase()} 题目创建成功${buildSummary}`,
    }
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
async function replaceBuild(item, file) {
  if (!file) return
  try { const result = await uploadBuild(item, file, { showPanel: true }); notice.value = { text: `镜像构建成功：${result.image}` } }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function manageHints(item) {
  hintChallenge.value = item; tab.value = 'hints'
  try { hints.value = await api(`/challenges/${item.id}/hints`) }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function createHint() {
  if (!hintChallenge.value) return
  try {
    const created = await api(`/challenges/${hintChallenge.value.id}/hints`, { method: 'POST', body: hintForm })
    hints.value.push(created); Object.assign(hintForm, { title: '', content: '', status: 'draft' })
    notice.value = { text: 'Hint 已创建' }
  } catch (err) { notice.value = { error: true, text: err.message } }
}
async function setHintStatus(hint, status) {
  try { Object.assign(hint, await api(`/challenges/hints/${hint.id}`, { method: 'PATCH', body: { status } })); notice.value = { text: status === 'published' ? 'Hint 已上线' : 'Hint 已下线' } }
  catch (err) { notice.value = { error: true, text: err.message } }
}
async function deleteHint(hint) {
  if (!window.confirm(`确定删除 Hint“${hint.title}”吗？`)) return
  try { await api(`/challenges/hints/${hint.id}`, { method: 'DELETE' }); hints.value = hints.value.filter((item) => item.id !== hint.id); notice.value = { text: 'Hint 已删除' } }
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
    <div class="page-heading">
      <div>
        <p class="eyebrow">CONTROL CENTER · ALPHA 0.0.2</p>
        <h1>平台管理<span class="accent">.</span></h1>
        <p class="lead">管理题目镜像、Hints、成员与上线状态。</p>
      </div>
    </div>
    <div class="tabs admin-tabs"><button :class="{ active: tab === 'challenges' }" @click="tab = 'challenges'">题目管理</button><button :class="{ active: tab === 'tags' }" @click="tab = 'tags'">标签管理</button><button :class="{ active: tab === 'users' }" @click="tab = 'users'">成员管理</button><button :class="{ active: tab === 'create' }" @click="tab = 'create'">＋ 上传题目</button></div>
    <p v-if="notice" :class="['alert', notice.error ? 'error' : 'success']">{{ notice.text }}</p>

    <div v-if="tab === 'challenges'" class="panel table-panel">
      <div class="data-row challenge-data data-head"><span>题目</span><span>模式 / 难度</span><span>分值</span><span>标签</span><span>状态</span><span>操作</span></div>
      <div v-for="item in challenges" :key="item.id" class="data-row challenge-data">
        <span><b>{{ item.title }}</b><small>{{ item.category }} · {{ item.slug }}</small></span>
        <span>{{ item.mode.toUpperCase() }} / {{ item.difficulty }}</span>
        <span>{{ item.points }}</span>
        <span class="tag-cell"><TagChips :tags="item.tags" compact /><button class="text-button" @click="openChallengeTags(item)">改标签</button></span>
        <span>
          <i :class="['status-pill', item.status]">{{ item.status === 'published' ? 'online' : 'offline' }}</i>
          <small :class="['build-state', item.build_status]">build: {{ item.build_status || 'none' }}</small>
          <small v-if="item.detected_port && item.internal_port && item.detected_port !== item.internal_port" class="build-state failed">端口 {{ item.internal_port }} ≠ EXPOSE {{ item.detected_port }}</small>
          <div v-if="item.build_progress && item.build_progress.status === 'building'" class="row-progress">
            <div class="progress-track"><div class="progress-fill" :style="{ width: `${item.build_progress.percent}%` }" /></div>
            <small>构建中 {{ item.build_progress.percent }}% · 点「构建日志」查看</small>
          </div>
        </span>
        <span class="row-actions">
          <label class="mini-upload">构建 ZIP<input type="file" accept=".zip,application/zip" @change="replaceBuild(item, $event.target.files[0]); $event.target.value = ''"></label>
          <label class="mini-upload">附件<input type="file" @change="uploadAttachment(item, $event.target.files[0]); $event.target.value = ''"></label>
          <template v-if="item.mode === 'awdp'">
            <label :class="['mini-upload', { configured: item.check_script_configured }]">Check<input type="file" accept=".sh,text/x-shellscript" @change="replaceScript(item, 'check_script', $event.target.files[0]); $event.target.value = ''"></label>
            <label :class="['mini-upload', { configured: item.fix_script_configured }]">Fix<input type="file" accept=".sh,text/x-shellscript" @change="replaceScript(item, 'fix_script', $event.target.files[0]); $event.target.value = ''"></label>
          </template>
          <button class="text-button" @click="manageHints(item)">Hints</button>
          <button class="text-button" @click="watchBuild(item)">构建日志</button>
          <button v-if="item.status !== 'published'" class="text-button" @click="setStatus(item, 'published')">上线</button>
          <button v-else class="text-button" @click="setStatus(item, 'draft')">下线</button>
          <button class="text-button danger" @click="deleteChallenge(item)">删除</button>
        </span>
      </div>
    </div>

    <div v-if="tab === 'hints' && hintChallenge" class="hint-admin-layout">
      <div class="panel hint-editor">
        <div class="form-heading">
          <button class="text-button" type="button" @click="tab = 'challenges'">← 返回题目管理</button>
          <p class="eyebrow">HINTS · {{ hintChallenge.slug }}</p>
          <h2>{{ hintChallenge.title }}</h2>
        </div>
        <form class="hint-form" @submit.prevent="createHint">
          <label>Hint 标题<input v-model.trim="hintForm.title" required minlength="1" maxlength="120" placeholder="例如：观察请求头"></label>
          <label>Hint 内容（Markdown）<textarea v-model.trim="hintForm.content" required minlength="1" rows="8" placeholder="支持 **Markdown**、代码块和链接" /></label>
          <label>初始状态<select v-model="hintForm.status"><option value="draft">下线</option><option value="published">上线</option></select></label>
          <button class="primary" type="submit">新增 Hint →</button>
        </form>
      </div>
      <div class="panel hint-list-panel">
        <div class="form-heading"><p class="eyebrow">PUBLISHED CONTROL</p><h2>已有 Hints</h2></div>
        <p v-if="!hints.length" class="muted">尚未创建 Hint。</p>
        <article v-for="hint in hints" :key="hint.id" class="hint-admin-item">
          <div><b>{{ hint.title }}</b><small>{{ hint.status === 'published' ? '选手可见' : '仅管理员可见' }}</small></div>
          <div class="row-actions">
            <button v-if="hint.status !== 'published'" class="text-button" @click="setHintStatus(hint, 'published')">上线</button>
            <button v-else class="text-button" @click="setHintStatus(hint, 'draft')">下线</button>
            <button class="text-button danger" @click="deleteHint(hint)">删除</button>
          </div>
        </article>
      </div>
    </div>

    <div v-if="tab === 'users'" class="panel table-panel">
      <div class="data-row user-data data-head"><span>成员</span><span>角色</span><span>状态</span><span>加入时间</span><span>操作</span></div>
      <div v-for="user in users" :key="user.id" class="data-row user-data"><span><b>{{ user.username }}</b><small>{{ user.id.slice(0, 8) }}</small></span><span><select :value="user.role" :disabled="user.id === session.user?.id" @change="updateUser(user, { role: $event.target.value })"><option value="player">选手</option><option value="admin">管理员</option></select></span><span><i :class="['status-pill', user.is_active ? 'published' : 'archived']">{{ user.is_active ? 'active' : 'disabled' }}</i></span><span>{{ new Date(user.created_at).toLocaleDateString('zh-CN') }}</span><span class="row-actions"><button class="text-button" :disabled="user.id === session.user?.id" @click="updateUser(user, { is_active: !user.is_active })">{{ user.is_active ? '禁用' : '启用' }}</button><button class="text-button danger" :disabled="user.id === session.user?.id" @click="deleteUser(user)">删除</button></span></div>
    </div>

    <div v-if="tab === 'challenges' && buildPanel.active" class="panel build-panel">
      <div class="form-heading">
        <div>
          <p class="eyebrow">IMAGE BUILD · {{ buildPanel.challenge?.slug }}</p>
          <h2>镜像构建{{ buildPanel.status === 'building' ? '进行中' : buildPanel.status === 'success' ? '完成' : '失败' }}</h2>
        </div>
        <button class="text-button" type="button" @click="closeBuildPanel">收起</button>
      </div>
      <div class="progress-track"><div :class="['progress-fill', buildPanel.status]" :style="{ width: `${buildPanel.percent}%` }" /></div>
      <p class="progress-label">
        <span>{{ buildPanel.challenge?.title }}</span>
        <span>{{ buildPanel.percent }}%</span>
      </p>
      <pre class="build-log">{{ buildPanel.log || '正在等待 Docker 输出…' }}</pre>
      <p v-if="buildPanel.status === 'building'" class="muted">构建期间可以离开此页面，日志会保留在题目记录中。</p>
    </div>

    <div v-if="challengeTagEditor" class="panel tag-editor-panel">
      <div class="form-heading">
        <div><p class="eyebrow">CHALLENGE TAGS</p><h2>{{ challengeTagEditor.title }}</h2></div>
        <button class="text-button" type="button" @click="challengeTagEditor = null">取消</button>
      </div>
      <p class="muted">选择知识点标签；动态/静态由题目是否配置 Docker 环境自动决定。</p>
      <TagChips
        :tags="[...topicTags.map((entry) => entry.name), ...(challengeTagEditor.tags || []).filter((tag) => !topicTags.some((entry) => entry.name === tag) && tag !== 'dynamic' && tag !== 'static')]"
        :selected="challengeTagDraft"
        selectable
        @toggle="toggleChallengeTag"
      />
      <div class="row-actions">
        <input v-model.trim="challengeTagDraftInput" placeholder="自定义标签，回车添加" @keyup.enter="addCustomChallengeTag">
        <button class="primary" type="button" @click="saveChallengeTags">保存标签</button>
      </div>
    </div>

    <div v-if="tab === 'tags'" class="panel">
      <div class="form-heading tag-heading">
        <div><p class="eyebrow">TAG CATALOG</p><h2>标签管理</h2></div>
        <button class="primary" type="button" @click="openTagCreator">＋ 新建标签</button>
      </div>
      <p class="muted">知识点标签可重命名和删除；动态/静态由题目环境自动判定，不能修改。</p>
      <div class="data-row tag-data data-head"><span>标签</span><span>类型</span><span>题目数</span><span>说明</span><span>操作</span></div>
      <div v-for="entry in tagCatalog" :key="entry.id" class="data-row tag-data">
        <span><b>{{ tagLabel(entry.name) }}</b><small>{{ entry.name }}</small></span>
        <span><i :class="['status-pill', entry.kind === 'state' ? 'archived' : 'published']">{{ entry.kind === 'state' ? '自动' : '知识点' }}</i></span>
        <span>{{ entry.challenge_count }}</span>
        <span>{{ entry.description || '—' }}</span>
        <span class="row-actions">
          <template v-if="entry.kind === 'topic'">
            <button class="text-button" @click="startTagEdit(entry)">重命名</button>
            <button class="text-button danger" @click="deleteTag(entry)">删除</button>
          </template>
          <span v-else class="muted">自动维护</span>
        </span>
      </div>
      <form v-if="tagCreator.open" class="inline-tag-form" @submit.prevent="createTag">
        <label>新标签名<input v-model.trim="tagCreator.name" required minlength="1" maxlength="32" placeholder="例如：stack-overflow"></label>
        <label>说明<input v-model.trim="tagCreator.description" maxlength="200" placeholder="可选"></label>
        <button class="primary" type="submit">创建</button>
        <button class="text-button" type="button" @click="tagCreator.open = false">取消</button>
      </form>
      <form v-if="tagEditor" class="inline-tag-form" @submit.prevent="saveTag">
        <label>标签名<input v-model.trim="tagDraft.name" required minlength="1" maxlength="32"></label>
        <label>说明<input v-model.trim="tagDraft.description" maxlength="200" placeholder="可选"></label>
        <button class="primary" type="submit">保存</button>
        <button class="text-button" type="button" @click="tagEditor = null">取消</button>
      </form>
    </div>

    <form v-if="tab === 'create'" class="panel challenge-form" @submit.prevent="createChallenge">
      <div class="form-heading"><p class="eyebrow">UPLOAD TRAINING TARGET</p><h2>上传 {{ form.mode.toUpperCase() }} 题目</h2></div>
      <div class="mode-selector"><button type="button" :class="{ active: form.mode === 'ctf' }" @click="form.mode = 'ctf'">CTF 题目</button><button type="button" :class="{ active: form.mode === 'awdp' }" @click="form.mode = 'awdp'">AWDP 题目</button></div>
      <div class="form-grid">
        <label>题目名称<input v-model.trim="form.title" required minlength="2" placeholder="例如：SQL Garden"></label>
        <label>唯一标识<input v-model.trim="form.slug" required pattern="[a-z0-9-]+" placeholder="sql-garden"></label>
        <label>分类<select v-model="form.category"><option v-for="item in categories" :key="item">{{ item }}</option></select></label>
        <label>难度<select v-model="form.difficulty"><option value="noob">Noob</option><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option><option value="insane">Insane</option></select></label>
        <label>分值<input v-model.number="form.points" required type="number" min="1" max="10000"></label>
        <label>初始状态<select v-model="form.status"><option value="draft">下线</option><option value="published">上线</option></select></label>
        <label class="span-2">本地构建文件（ZIP）<input type="file" accept=".zip,application/zip" @change="buildFile = $event.target.files[0]"><small>上传题目时立即构建镜像；ZIP 中需包含且只能包含一个 Dockerfile。</small></label>
        <label>已有 Docker 镜像<input v-model.trim="form.docker_image" placeholder="nginx:alpine（不上传 ZIP 时使用）"></label>
        <label>容器端口<input v-model.number="form.internal_port" type="number" min="1" max="65535" placeholder="留空则读取 EXPOSE"><small>必须与镜像内服务真实监听的端口一致，留空时读取 Dockerfile 的 EXPOSE。</small></label>
        <label class="span-2">题目说明（Markdown）<textarea v-model.trim="form.description" required minlength="10" rows="8" placeholder="# 背景&#10;&#10;描述目标、代码片段与任务…" /><small>选手端可展开/隐藏，支持 Markdown；HTML 会经过安全过滤。</small></label>
        <label class="span-2">Flag<input v-model="form.flag" required minlength="3" placeholder="SYC{...}"></label>
        <div class="span-2 dynamic-flag-field">
          <button type="button" :class="['switch', { on: form.dynamic_flag }]" @click="toggleDynamicFlag">
            <span class="knob" />{{ form.dynamic_flag ? '已启用动态 Flag' : '未启用动态 Flag' }}
          </button>
          <small>启用后平台会把 Flag 中的 <code>RAND</code> 替换为随机字符串，并为每个实例注入不同的值；关闭则所有实例共用同一 Flag。</small>
        </div>
        <div class="span-2 tag-field">
          <span class="field-label">题目标签</span>
          <TagChips :tags="topicTags.map((entry) => entry.name)" :selected="form.tags" selectable @toggle="toggleFormTag" />
          <small>选择知识点标签，可留空；动态/静态标签会根据是否配置 Docker 环境自动生成。</small>
        </div>
        <template v-if="form.mode === 'awdp'">
          <label>Check 脚本<input required type="file" accept=".sh,text/x-shellscript" @change="checkFile = $event.target.files[0]"><small>部署补丁后自动执行，用于验证服务状态</small></label>
          <label>Fix 脚本<input required type="file" accept=".sh,text/x-shellscript" @change="fixFile = $event.target.files[0]"><small>题目官方修复脚本，仅由管理员维护</small></label>
        </template>
      </div>
      <button class="primary" :disabled="saving">{{ saving ? '正在构建与上传…' : `上传 ${form.mode.toUpperCase()} 题目 →` }}</button>
    </form>
  </section>
</template>
