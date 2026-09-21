<script setup>
import { ref } from 'vue'
import MarkdownBlock from './MarkdownBlock.vue'

defineProps({
  challenge: { type: Object, required: true },
  hints: { type: Array, default: () => [] },
})
const detailOpen = ref(false)
const openHints = ref(new Set())
const medals = ['Ⅰ', 'Ⅱ', 'Ⅲ']
function toggleHint(id) {
  const next = new Set(openHints.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  openHints.value = next
}
</script>

<template>
  <div class="intel-stack">
    <div :class="['solve-overview', { split: challenge.mode === 'awdp' }]">
      <article class="solve-card"><div><span>{{ challenge.mode === 'awdp' ? 'ATTACK SOLVES' : 'SOLVES' }}</span><strong>{{ challenge.mode === 'awdp' ? challenge.attack_solves : challenge.solves }}</strong></div><div class="blood-list"><span v-for="entry in (challenge.mode === 'awdp' ? challenge.attack_bloods : challenge.bloods)" :key="entry.user_id"><i>{{ medals[entry.rank - 1] }}</i>{{ entry.username }}</span><small v-if="!(challenge.mode === 'awdp' ? challenge.attack_bloods : challenge.bloods).length">等待首血</small></div></article>
      <article v-if="challenge.mode === 'awdp'" class="solve-card defense"><div><span>DEFENSE SOLVES</span><strong>{{ challenge.defense_solves }}</strong></div><div class="blood-list"><span v-for="entry in challenge.defense_bloods" :key="entry.user_id"><i>{{ medals[entry.rank - 1] }}</i>{{ entry.username }}</span><small v-if="!challenge.defense_bloods.length">等待防御首血</small></div></article>
    </div>
    <article class="panel accordion-panel">
      <button class="accordion-head" @click="detailOpen = !detailOpen"><span><small>MARKDOWN DETAILS</small><b>题目详细信息</b></span><i>{{ detailOpen ? '−' : '+' }}</i></button>
      <MarkdownBlock v-if="detailOpen" :source="challenge.description" />
    </article>
    <article class="panel hints-panel">
      <div class="hints-heading"><span><small>CHALLENGE HINTS</small><b>Hints</b></span><em>{{ hints.length }}</em></div>
      <div v-if="!hints.length" class="empty compact-empty">管理员尚未上线 Hint</div>
      <div v-for="(hint, index) in hints" :key="hint.id" class="hint-item"><button @click="toggleHint(hint.id)"><span>Hint {{ String(index + 1).padStart(2, '0') }} · {{ hint.title }}</span><i>{{ openHints.has(hint.id) ? '−' : '+' }}</i></button><MarkdownBlock v-if="openHints.has(hint.id)" :source="hint.content" /></div>
    </article>
  </div>
</template>
