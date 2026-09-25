<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api'
import { notify } from '../notifications'
import MarkdownBlock from './MarkdownBlock.vue'

const items = ref([])
const editing = ref(null)
const form = reactive({ title: '', content: '', status: 'draft' })
const busy = ref(false)
async function load() { try { items.value = await api('/announcements') } catch { /* API displays the error */ } }
function edit(item) { editing.value = item.id; Object.assign(form, { title: item.title, content: item.content, status: item.status }) }
function reset() { editing.value = null; Object.assign(form, { title: '', content: '', status: 'draft' }) }
async function save() {
  busy.value = true
  try {
    await api(editing.value ? `/announcements/${editing.value}` : '/announcements', {
      method: editing.value ? 'PATCH' : 'POST', body: { ...form },
    })
    await load(); reset(); notify('公告已保存', 'success')
  } catch { /* API displays the error */ }
  finally { busy.value = false }
}
async function remove(item) {
  if (!window.confirm(`删除公告“${item.title}”？`)) return
  try { await api(`/announcements/${item.id}`, { method: 'DELETE' }); await load(); notify('公告已删除', 'success') }
  catch { /* API displays the error */ }
}
onMounted(load)
</script>

<template>
  <div class="content-manager">
    <form class="panel manager-form" @submit.prevent="save">
      <div class="form-heading"><p class="eyebrow">BULLETIN</p><h2>{{ editing ? '编辑公告' : '发布公告' }}</h2></div>
      <label>标题<input v-model.trim="form.title" required maxlength="120"></label>
      <label>内容（Markdown）<textarea v-model.trim="form.content" required rows="6" maxlength="10000" /></label>
      <label>状态<select v-model="form.status"><option value="draft">草稿</option><option value="published">发布</option></select></label>
      <div class="row-actions"><button class="primary" :disabled="busy">{{ busy ? '保存中…' : '保存公告' }}</button><button v-if="editing" type="button" class="text-button" @click="reset">取消编辑</button></div>
    </form>
    <div class="panel"><div class="form-heading"><p class="eyebrow">ANNOUNCEMENT LIST</p><h2>公告列表</h2></div>
      <p v-if="!items.length" class="muted">暂无公告</p>
      <article v-for="item in items" :key="item.id" class="manager-item">
        <div class="section-heading"><div><h3>{{ item.title }}</h3><small>{{ item.author || '已删除的管理员' }} · {{ new Date(item.updated_at).toLocaleString('zh-CN') }}</small></div><i :class="['status-pill', item.status]">{{ item.status === 'published' ? '已发布' : '草稿' }}</i></div>
        <MarkdownBlock :source="item.content" />
        <div class="row-actions"><button class="text-button" @click="edit(item)">编辑</button><button class="text-button danger" @click="remove(item)">删除</button></div>
      </article>
    </div>
  </div>
</template>
