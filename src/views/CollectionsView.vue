<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import MarkdownBlock from '../components/MarkdownBlock.vue'
import TagChips from '../components/TagChips.vue'

const route = useRoute()
const collections = ref([])
const challenges = ref([])
const current = computed(() => collections.value.find((item) => item.id === route.params.id))
const members = computed(() => current.value?.challenge_ids.map((id) => challenges.value.find((item) => item.id === id)).filter(Boolean) || [])
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    ;[collections.value, challenges.value] = await Promise.all([api('/collections'), api('/challenges')])
  } catch (err) { error.value = err.message }
  finally { loading.value = false }
})
</script>

<template>
  <section>
    <RouterLink v-if="route.params.id" class="back-link" to="/sets">← 返回题集</RouterLink>
    <div class="page-heading"><div>
      <p class="eyebrow">CURATED CHALLENGES · ALPHA 0.0.9</p>
      <h1>{{ current ? current.title : '训练题集' }}<span class="accent">.</span></h1>
      <p class="lead">按主题串联题目，循序完成训练。</p>
    </div></div>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div v-if="loading" class="empty">正在加载题集…</div>
    <template v-else-if="!route.params.id">
      <div v-if="!collections.length" class="empty">暂无已发布题集</div>
      <div class="collection-grid">
        <RouterLink v-for="item in collections" :key="item.id" class="panel collection-card" :to="`/sets/${item.id}`">
          <p class="eyebrow">TRAINING SET · {{ item.challenge_count }} TASKS</p>
          <h2>{{ item.title }}</h2>
          <p class="muted">{{ item.description }}</p>
          <span>进入题集 →</span>
        </RouterLink>
      </div>
    </template>
    <template v-else-if="current">
      <div class="panel collection-intro"><MarkdownBlock :source="current.description" /><p>{{ members.filter((item) => item.solved).length }} / {{ members.length }} 已完成</p></div>
      <div v-if="!members.length" class="empty">题集暂无可见题目</div>
      <div class="collection-members">
        <RouterLink v-for="(item, index) in members" :key="item.id" class="panel collection-member" :to="`/${item.mode}/${item.id}`">
          <span class="collection-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div><small>{{ item.mode.toUpperCase() }} · {{ item.category }} · {{ item.difficulty }}</small><h2>{{ item.title }}</h2><TagChips :tags="item.tags" compact /></div>
          <strong>{{ item.solved ? '✓ 已完成' : `${item.points} PTS →` }}</strong>
        </RouterLink>
      </div>
    </template>
    <p v-else class="empty">题集不存在或尚未发布</p>
  </section>
</template>
