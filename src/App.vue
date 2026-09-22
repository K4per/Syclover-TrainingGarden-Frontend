<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearSession, session } from './api'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const loggedIn = computed(() => Boolean(session.token))

function logout() {
  clearSession()
  menuOpen.value = false
  router.push('/login')
}
</script>

<template>
  <div class="app-shell" :class="{ 'auth-shell': !loggedIn }">
    <template v-if="loggedIn">
      <header class="topbar">
        <RouterLink class="brand" to="/" @click="menuOpen = false">
          <img class="brand-logo" src="/syclover-logo.svg" alt="Syclover Training Garden">
        </RouterLink>
        <button class="menu-toggle" aria-label="切换导航" @click="menuOpen = !menuOpen">☰</button>
        <nav :class="{ open: menuOpen }">
          <RouterLink to="/" @click="menuOpen = false">总览</RouterLink>
          <RouterLink to="/practice" @click="menuOpen = false">练习大厅</RouterLink>
          <RouterLink to="/scoreboard" @click="menuOpen = false">排行榜</RouterLink>
          <RouterLink v-if="session.user?.role === 'admin'" to="/admin" @click="menuOpen = false">管理</RouterLink>
        </nav>
        <div class="user-menu">
          <span class="status-dot" />
          <RouterLink class="user-profile-link" to="/profile" @click="menuOpen = false">
            <span class="user-avatar">
              <img v-if="session.user?.avatar_url" :src="session.user.avatar_url" :alt="`${session.user.username} 的头像`">
              <span v-else>{{ session.user?.username?.slice(0, 1).toUpperCase() }}</span>
            </span>
            <span class="user-name">{{ session.user?.username }}</span>
          </RouterLink>
          <span class="role-tag">{{ session.user?.role === 'admin' ? '管理员' : '选手' }}</span>
          <button class="text-button" @click="logout">退出</button>
        </div>
      </header>
      <div class="grid-glow" />
    </template>
    <main :class="{ 'page-wrap': loggedIn }">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in"><component :is="Component" :key="route.fullPath" /></Transition>
      </RouterView>
    </main>
    <footer v-if="loggedIn">Syclover Security Team · Alpha0.0.5 · Grow through breaking &amp; building</footer>
  </div>
</template>
