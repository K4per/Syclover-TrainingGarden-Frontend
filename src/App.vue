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
          <RouterLink to="/ctf" @click="menuOpen = false">CTF 题库</RouterLink>
          <RouterLink to="/awdp" @click="menuOpen = false">AWDP 题库</RouterLink>
          <RouterLink to="/scoreboard" @click="menuOpen = false">排行榜</RouterLink>
          <RouterLink v-if="session.user?.role === 'admin'" to="/admin" @click="menuOpen = false">管理</RouterLink>
        </nav>
        <div class="user-menu">
          <span class="status-dot" />
          <span>{{ session.user?.username }}</span>
          <span class="role-tag">{{ session.user?.role === 'admin' ? '管理员' : '选手' }}</span>
          <button class="text-button" @click="logout">退出</button>
        </div>
      </header>
      <div class="grid-glow" />
    </template>
    <main :class="{ 'page-wrap': loggedIn }">
      <RouterView :key="route.fullPath" />
    </main>
    <footer v-if="loggedIn">Syclover Security Team · Alpha0.0.3 · Grow through breaking &amp; building</footer>
  </div>
</template>
