<script setup>
const props = defineProps({
  tags: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  selectable: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  catalog: { type: Array, default: () => [] },
  showCount: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle'])

const stateTags = ['static', 'dynamic']
const stateLabels = { dynamic: '动态', static: '静态' }
const topicLabels = {
  web: 'Web', pwn: 'Pwn', reverse: 'Reverse', crypto: 'Crypto', misc: 'Misc',
}

function labelOf(tag) {
  return stateLabels[tag] || topicLabels[tag] || tag
}

function kindOf(tag) {
  return stateTags.includes(tag) ? 'state' : 'topic'
}
function detailOf(tag) { return props.catalog.find((item) => item.name === tag) }
</script>

<template>
  <div :class="['tag-row', { compact }]">
    <button
      v-for="tag in tags"
      :key="tag"
      type="button"
      :class="['tag-chip', kindOf(tag), { active: selected.includes(tag), readonly: !selectable }]"
      :disabled="!selectable"
      :title="detailOf(tag)?.description || (kindOf(tag) === 'state' ? '由题目是否配置 Docker 环境自动决定' : tag)"
      @click="emit('toggle', tag)"
    >
      {{ labelOf(tag) }}<small v-if="showCount && detailOf(tag)"> {{ detailOf(tag).challenge_count }}</small>
    </button>
    <span v-if="!tags.length" class="muted">无标签</span>
  </div>
</template>
