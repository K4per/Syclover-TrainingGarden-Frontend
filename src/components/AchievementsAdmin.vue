<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api, session } from '../api'
import { notify } from '../notifications'

const props = defineProps({ users: { type: Array, default: () => [] } })
const catalog = ref([])
const editing = ref(null)
const selectedUserId = ref('')
const selectedUser = computed(() => props.users.find((user) => user.id === selectedUserId.value))
const isRoot = computed(() => session.user?.role === 'root_admin')
const form = reactive({ slug: '', name: '', description: '', acquisition: '', icon: 'core' })
async function load() { try { catalog.value = await api('/achievements') } catch { /* API displays the error */ } }
function edit(item) { editing.value = item.slug; Object.assign(form, { slug: item.slug, name: item.name, description: item.description, acquisition: item.acquisition, icon: item.icon }) }
function reset() { editing.value = null; Object.assign(form, { slug: '', name: '', description: '', acquisition: '', icon: 'core' }) }
async function save() {
  try {
    const { slug, ...fields } = form
    await api(editing.value ? `/achievements/${editing.value}` : '/achievements', {
      method: editing.value ? 'PATCH' : 'POST', body: editing.value ? fields : { slug, ...fields },
    })
    await load(); reset(); notify('成就目录已保存', 'success')
  } catch { /* API displays the error */ }
}
async function remove(item) {
  if (!window.confirm(`删除成就“${item.name}”？`)) return
  try { await api(`/achievements/${item.slug}`, { method: 'DELETE' }); await load(); notify('成就已删除', 'success') }
  catch { /* API displays the error */ }
}
async function award(item, revoke = false) {
  if (!selectedUser.value) return
  try {
    await api(`/users/${selectedUser.value.id}/achievements/${item.slug}`, { method: revoke ? 'DELETE' : 'POST' })
    const current = new Set(selectedUser.value.achievement_slugs || [])
    if (revoke) current.delete(item.slug)
    else current.add(item.slug)
    if (item.slug === 'core_member') {
      if (revoke) current.add('sprout_member')
      else current.delete('sprout_member')
    }
    selectedUser.value.achievement_slugs = [...current]
    notify(revoke ? '成就已撤销' : '成就已授予', 'success')
  } catch { /* API displays the error */ }
}
onMounted(load)
</script>

<template>
  <div class="content-manager">
    <form class="panel manager-form" @submit.prevent="save">
      <div class="form-heading"><p class="eyebrow">ACHIEVEMENT CATALOG</p><h2>{{ editing ? '编辑成就' : '新建自定义成就' }}</h2></div>
      <label>标识<input v-model.trim="form.slug" :disabled="Boolean(editing)" required pattern="[a-z0-9_]{2,48}"></label>
      <label>名称<input v-model.trim="form.name" required maxlength="80"></label>
      <label>描述<input v-model.trim="form.description" required maxlength="300"></label>
      <label>获取方式<input v-model.trim="form.acquisition" required maxlength="200"></label>
      <label>图标代号<input v-model.trim="form.icon" required pattern="[a-z0-9-]{1,48}" placeholder="core"><small>未知代号会使用默认徽章图标。</small></label>
      <div class="row-actions"><button class="primary">{{ editing ? '保存修改' : '创建成就' }}</button><button v-if="editing" type="button" class="text-button" @click="reset">取消</button></div>
    </form>
    <div class="panel"><div class="form-heading"><p class="eyebrow">BADGES</p><h2>成就目录</h2></div>
      <label v-if="isRoot">向成员授予或撤销<select v-model="selectedUserId"><option value="">选择成员</option><option v-for="user in users" :key="user.id" :value="user.id">{{ user.username }}</option></select></label>
      <article v-for="item in catalog" :key="item.slug" class="manager-item">
        <div class="section-heading"><div><h3>{{ item.name }}</h3><small>{{ item.slug }} · {{ item.is_builtin ? '内置规则' : '自定义' }}</small></div></div>
        <p class="muted">{{ item.description }} · {{ item.acquisition }}</p>
        <div class="row-actions">
          <button class="text-button" @click="edit(item)">编辑</button>
          <button v-if="!item.is_builtin" class="text-button danger" @click="remove(item)">删除</button>
          <template v-if="isRoot && selectedUser">
            <button v-if="!selectedUser.achievement_slugs?.includes(item.slug)" class="text-button" @click="award(item)">授予</button>
            <button v-else-if="!item.is_builtin || ['core_member', 'peak_geek_2025'].includes(item.slug)" class="text-button danger" @click="award(item, true)">撤销</button>
          </template>
        </div>
      </article>
    </div>
  </div>
</template>
