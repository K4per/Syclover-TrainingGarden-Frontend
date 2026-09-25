<script setup>
import { notifications, dismissNotification } from '../notifications'
</script>

<template>
  <div class="notification-control">
    <button class="text-button notification-trigger" type="button" :aria-expanded="notifications.open" @click="notifications.open = !notifications.open">
      消息 <span v-if="notifications.history.length">{{ notifications.history.length }}</span>
    </button>
    <div v-if="notifications.open" class="notification-history panel">
      <div class="section-heading"><h2>提示消息</h2><button class="text-button" @click="notifications.open = false">关闭</button></div>
      <p v-if="!notifications.history.length" class="muted">暂无消息</p>
      <article v-for="item in notifications.history" :key="item.id" :class="['notification-entry', item.type]">
        <small>{{ new Date(item.time).toLocaleString('zh-CN') }}</small><p>{{ item.text }}</p>
      </article>
    </div>
  </div>
  <Transition name="notification-fade">
    <div v-if="notifications.active" :key="notifications.active.id" :class="['notification-popup', notifications.active.type]" role="status">
      <span>{{ notifications.active.text }}</span>
      <button type="button" aria-label="关闭提示" @click="dismissNotification">×</button>
    </div>
  </Transition>
</template>
