<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, session } from '../api'

const challenges = ref([])
const scoreboard = ref({ participants: 0, published_challenges: 0, total_solves: 0, rankings: [] })
const instances = ref([])
const error = ref('')

const solved = computed(() => challenges.value.filter((item) => item.solved).length)
const active = computed(() => instances.value.filter((item) => item.status === 'running'))
const myRank = computed(() => scoreboard.value.rankings.find((item) => item.user_id === session.user?.id))

onMounted(async () => {
  try {
    ;[challenges.value, scoreboard.value, instances.value] = await Promise.all([
      api('/challenges'), api('/scoreboard'), api('/instances'),
    ])
  } catch (err) { error.value = err.message }
})
</script>

<template>
  <section>
    <div class="hero-row">
      <div>
        <p class="eyebrow">OPERATIONS OVERVIEW · {{ new Date().toLocaleDateString('zh-CN') }}</p>
        <h1>晚上好，{{ session.user?.username }}<span class="accent">.</span></h1>
        <p class="lead">选择一个目标，启动隔离环境，然后开始今天的训练。</p>
      </div>
      <RouterLink class="primary" to="/ctf">进入 CTF 训练场 →</RouterLink>
    </div>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="stat-grid">
      <article class="stat-card"><span>已解题目</span><strong>{{ solved }}<small>/ {{ challenges.length }}</small></strong><div class="progress"><i :style="{ width: `${challenges.length ? solved / challenges.length * 100 : 0}%` }" /></div></article>
      <article class="stat-card"><span>当前积分</span><strong>{{ myRank?.score || 0 }}<small>PTS</small></strong><p>全站排名 #{{ myRank?.rank || '—' }}</p></article>
      <article class="stat-card"><span>运行环境</span><strong>{{ active.length }}<small>ACTIVE</small></strong><p>{{ instances.length }} 个历史实例</p></article>
      <article class="stat-card"><span>训练动态</span><strong>{{ scoreboard.total_solves }}<small>SOLVES</small></strong><p>{{ scoreboard.participants }} 位选手参与</p></article>
    </div>
    <div class="two-column dashboard-content">
      <div class="panel">
        <div class="section-heading"><div><p class="eyebrow">RECOMMENDED TARGETS</p><h2>继续训练</h2></div><RouterLink to="/ctf">查看题库</RouterLink></div>
        <div v-if="!challenges.length" class="empty">暂无已发布题目</div>
        <RouterLink v-for="challenge in challenges.slice(0, 4)" :key="challenge.id" class="compact-challenge" :to="`/${challenge.mode}/${challenge.id}`">
          <span class="mode-icon">{{ challenge.mode === 'ctf' ? 'CTF' : 'AW' }}</span>
          <span class="grow"><b>{{ challenge.title }}</b><small>{{ challenge.category }} · {{ challenge.difficulty }}</small></span>
          <span :class="['points', { solved: challenge.solved }]">{{ challenge.solved ? '✓ 已解' : `+${challenge.points}` }}</span>
        </RouterLink>
      </div>
      <div class="panel rank-preview">
        <div class="section-heading"><div><p class="eyebrow">LIVE RANKING</p><h2>排行榜</h2></div><RouterLink to="/scoreboard">完整榜单</RouterLink></div>
        <div v-if="!scoreboard.rankings.length" class="empty">等待第一位选手上榜</div>
        <div v-for="entry in scoreboard.rankings.slice(0, 6)" :key="entry.user_id" class="rank-row" :class="{ me: entry.user_id === session.user?.id }">
          <strong>#{{ String(entry.rank).padStart(2, '0') }}</strong><span class="avatar">{{ entry.username[0].toUpperCase() }}</span><span class="grow">{{ entry.username }}<small>{{ entry.solves }} solves</small></span><b>{{ entry.score }}</b>
        </div>
      </div>
    </div>
  </section>
</template>
