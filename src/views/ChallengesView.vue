<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'

const route = useRoute()
const mode = computed(() => route.meta.mode)
const challenges = ref([])
const category = ref('all')
const search = ref('')
const loading = ref(true)
const error = ref('')
const categoryOptions = computed(() => mode.value === 'awdp'
  ? ['all', 'Web', 'Pwn']
  : ['all', 'Web', 'Pwn', 'Reverse', 'Misc', 'Crypto'])
const difficultyLabels = { noob: 'Noob', easy: 'Easy', normal: 'Normal', hard: 'Hard', insane: 'Insane' }
const filtered = computed(() => challenges.value.filter((item) =>
  (category.value === 'all' || item.category === category.value) &&
  `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(search.value.toLowerCase())
))

onMounted(async () => {
  try { challenges.value = await api(`/challenges?mode=${mode.value}`) }
  catch (err) { error.value = err.message }
  finally { loading.value = false }
})
</script>

<template>
  <section>
    <div class="page-heading"><div>
      <p class="eyebrow">{{ mode === 'ctf' ? 'CAPTURE THE FLAG' : 'ATTACK WITH DEFENSE' }}</p>
      <h1>{{ mode === 'ctf' ? 'CTF 题库' : 'AWDP 题库' }}<span class="accent">.</span></h1>
      <p class="lead">{{ mode === 'ctf' ? '独立靶场、附件分析与 Flag 验证，专注漏洞利用能力。' : '在真实服务中完成攻击验证、补丁部署与自动 Check。' }}</p>
    </div></div>
    <div class="toolbar">
      <div class="tabs"><button v-for="item in categoryOptions" :key="item" :class="{ active: category === item }" @click="category = item">{{ item === 'all' ? '全部分类' : item }}</button></div>
      <input v-model="search" class="search" placeholder="搜索题目…">
    </div>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div v-if="loading" class="empty">正在载入 {{ mode.toUpperCase() }} 训练目标…</div>
    <div v-else class="challenge-grid">
      <RouterLink v-for="challenge in filtered" :key="challenge.id" class="challenge-card" :to="`/${mode}/${challenge.id}`">
        <div class="card-top"><span :class="['mode-badge', challenge.mode]">{{ challenge.mode.toUpperCase() }}</span><span :class="['difficulty', challenge.difficulty]">{{ difficultyLabels[challenge.difficulty] }}</span></div>
        <p class="category">{{ challenge.category }}</p><h2>{{ challenge.title }}</h2><p>{{ challenge.description }}</p>
        <div class="card-bottom"><strong>{{ challenge.points }} <small>PTS</small></strong><span v-if="challenge.solved" class="solved-label">✓ 已完成</span><span v-else>{{ mode === 'ctf' ? '打开题目' : '进入攻防' }} →</span></div>
      </RouterLink>
    </div>
    <div v-if="!loading && !filtered.length" class="empty">该分类暂无题目</div>
  </section>
</template>
