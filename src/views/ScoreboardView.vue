<script setup>
import { onMounted, ref } from 'vue'
import { api, session } from '../api'
const board = ref({ participants: 0, published_challenges: 0, total_solves: 0, rankings: [] })
const error = ref('')
const mode = ref('ctf')
async function load() {
  try { board.value = await api(`/scoreboard?mode=${mode.value}`) }
  catch (err) { error.value = err.message }
}
async function setMode(value) { mode.value = value; await load() }
onMounted(load)
</script>

<template>
  <section>
    <div class="page-heading center"><p class="eyebrow">HALL OF FAME</p><h1>{{ mode.toUpperCase() }} 排行榜<span class="accent">.</span></h1><p class="lead">CTF 与 AWDP 独立计分；分数相同时，率先完成解题的选手排名靠前。</p></div>
    <div class="tabs scoreboard-tabs"><button :class="{ active: mode === 'ctf' }" @click="setMode('ctf')">CTF 排行</button><button :class="{ active: mode === 'awdp' }" @click="setMode('awdp')">AWDP 排行</button></div>
    <div class="score-stats"><span><b>{{ board.participants }}</b> 参赛选手</span><span><b>{{ board.published_challenges }}</b> 开放题目</span><span><b>{{ board.total_solves }}</b> 有效解题</span></div>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="leaderboard panel">
      <div class="leader-head"><span>排名</span><span>选手</span><span>解题数</span><span>总分</span></div>
      <div v-for="entry in board.rankings" :key="entry.user_id" class="leader-row" :class="[{ me: entry.user_id === session.user?.id }, `place-${entry.rank}`]">
        <span class="leader-rank">{{ entry.rank <= 3 ? ['◆','▲','●'][entry.rank - 1] : `#${String(entry.rank).padStart(2,'0')}` }}</span><span class="leader-user"><i>{{ entry.username[0].toUpperCase() }}</i><b>{{ entry.username }}</b><small v-if="entry.user_id === session.user?.id">YOU</small></span><span>{{ entry.solves }}</span><strong>{{ entry.score }} <small>PTS</small></strong>
      </div>
      <div v-if="!board.rankings.length" class="empty">榜单还是空的，去拿下第一个 Flag 吧</div>
    </div>
  </section>
</template>
