<script setup>
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const props = defineProps({ source: { type: String, default: '' } })
marked.setOptions({ breaks: true, gfm: true })
const html = computed(() => DOMPurify.sanitize(marked.parse(props.source || '')))
</script>

<template><div class="markdown-body" v-html="html" /></template>
