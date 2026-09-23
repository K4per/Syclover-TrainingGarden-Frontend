<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api'
import { notify } from '../notifications'

const props = defineProps({ challenges: { type: Array, required: true } })
const items = ref([])
const editing = ref(null)
const search = ref('')
const form = reactive({ title: '', slug: '', description: '', status: 'draft', challenge_ids: [] })
const choices = computed(() => props.challenges.filter((item) => `${item.title} ${item.slug} ${item.category}`.toLowerCase().includes(search.value.toLowerCase())))
const busy = ref(false)
async function load() { try { items.value = await api('/collections') } catch { /* API displays the error */ } }
function edit(item) { editing.value = item.id; Object.assign(form, { title: item.title, slug: item.slug, description: item.description, status: item.status, challenge_ids: [...item.challenge_ids] }) }
function reset() { editing.value = null; Object.assign(form, { title: '', slug: '', description: '', status: 'draft', challenge_ids: [] }) }
function toggle(id) {
  const position = form.challenge_ids.indexOf(id)
  if (position < 0) form.challenge_ids.push(id)
  else form.challenge_ids.splice(position, 1)
}
function move(id, offset) {
  const position = form.challenge_ids.indexOf(id)
  const target = position + offset
  if (position < 0 || target < 0 || target >= form.challenge_ids.length) return
  ;[form.challenge_ids[position], form.challenge_ids[target]] = [form.challenge_ids[target], form.challenge_ids[position]]
}
async function save() {
  busy.value = true
  try {
    await api(editing.value ? `/collections/${editing.value}` : '/collections', {
      method: editing.value ? 'PATCH' : 'POST', body: { ...form, challenge_ids: [...form.challenge_ids] },
    })
    await load(); reset(); notify('题集已保存', 'success')
  } catch { /* API displays the error */ }
  finally { busy.value = false }
}
async function remove(item) {
  if (!window.confirm(`删除题集“${item.title}”？题目本身不会删除。`)) return
  try { await api(`/collections/${item.id}`, { method: 'DELETE' }); await load(); notify('题集已删除', 'success') }
  catch { /* API displays the error */ }
}
onMounted(load)
</script>

<template>
  <div class="content-manager">
    <form class="panel manager-form" @submit.prevent="save">
      <div class="form-heading"><p class="eyebrow">CURATED CHALLENGES</p><h2>{{ editing ? '编辑题集' : '新建题集' }}</h2></div>
      <label>名称<input v-model.trim="form.title" required maxlength="120"></label>
      <label>标识（小写英文、数字和连字符）<input v-model.trim="form.slug" required pattern="[a-z0-9-]{2,80}"></label>
      <label>简介（Markdown）<textarea v-model.trim="form.description" required rows="5" maxlength="5000" /></label>
      <label>状态<select v-model="form.status"><option value="draft">草稿</option><option value="published">发布</option></select></label>
      <label>搜索题目<input v-model.trim="search" placeholder="名称、标识或分类"></label>
      <div class="collection-picker">
        <label v-for="item in choices" :key="item.id"><input type="checkbox" :checked="form.challenge_ids.includes(item.id)" @change="toggle(item.id)"><span>{{ item.title }} <small>{{ item.mode.toUpperCase() }} · {{ item.status === 'published' ? '已上线' : '未上线' }}</small></span></label>
      </div>
      <div v-if="form.challenge_ids.length" class="collection-selected">
        <p class="field-label">题目顺序</p>
        <div v-for="(id, index) in form.challenge_ids" :key="id" class="collection-selected-row">
          <span>{{ index + 1 }}. {{ challenges.find((item) => item.id === id)?.title || id }}</span>
          <div class="row-actions"><button type="button" class="text-button" :disabled="index === 0" @click="move(id, -1)">↑</button><button type="button" class="text-button" :disabled="index === form.challenge_ids.length - 1" @click="move(id, 1)">↓</button></div>
        </div>
      </div>
      <p class="muted">已选 {{ form.challenge_ids.length }} 道题；选手仅会看到其中已上线的题目。</p>
      <div class="row-actions"><button class="primary" :disabled="busy">{{ busy ? '保存中…' : '保存题集' }}</button><button v-if="editing" type="button" class="text-button" @click="reset">取消编辑</button></div>
    </form>
    <div class="panel"><div class="form-heading"><p class="eyebrow">COLLECTION LIST</p><h2>已有题集</h2></div>
      <p v-if="!items.length" class="muted">暂无题集</p>
      <article v-for="item in items" :key="item.id" class="manager-item">
        <div class="section-heading"><div><h3>{{ item.title }}</h3><small>{{ item.slug }} · {{ item.challenge_count }} 道题</small></div><i :class="['status-pill', item.status]">{{ item.status === 'published' ? '已发布' : '草稿' }}</i></div>
        <p class="muted">{{ item.description }}</p>
        <div class="row-actions"><RouterLink class="text-button" :to="`/sets/${item.id}`">查看</RouterLink><button class="text-button" @click="edit(item)">编辑</button><button class="text-button danger" @click="remove(item)">删除</button></div>
      </article>
    </div>
  </div>
</template>
