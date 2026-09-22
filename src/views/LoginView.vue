<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setSession } from '../api'

const router = useRouter()
const mode = ref('login')
const loading = ref(false)
const error = ref('')
const form = reactive({ username: '', password: '', invite_code: '' })

async function submit() {
  loading.value = true
  error.value = ''
  try {
    const body = mode.value === 'login'
      ? { username: form.username, password: form.password }
      : { username: form.username, password: form.password, invite_code: form.invite_code }
    const data = await api(`/auth/${mode.value}`, { method: 'POST', body })
    setSession(data)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <div class="login-art">
      <div class="hero-emblem"><img src="/syclover-mark.svg" alt=""></div>
      <p class="eyebrow">SY CLOVER SECURITY TEAM</p>
      <h1>在攻防之间，<br><span>让技术生长。</span></h1>
      <p class="lead">面向 CTF 与 AWDP 的安全技术训练场。部署真实环境、提交攻击成果、迭代防御方案。</p>
      <div class="terminal-card">
        <span>$ ./enter-garden --mode practice</span>
        <span class="terminal-line">[+] isolated range ready</span>
        <span class="terminal-line">[+] happy hacking<span class="cursor">_</span></span>
      </div>
    </div>
    <div class="login-panel">
      <div class="mobile-brand"><img src="/syclover-logo.svg" alt="Syclover Training Garden"></div>
      <p class="kicker">{{ mode === 'login' ? 'WELCOME BACK' : 'JOIN THE GARDEN' }}</p>
      <h2>{{ mode === 'login' ? '进入训练场' : '创建选手账号' }}</h2>
      <p class="muted">{{ mode === 'login' ? '使用你的队员账号继续训练' : '注册需要核心组发放的一次性邀请码' }}</p>
      <form @submit.prevent="submit">
        <label>用户名<input v-model.trim="form.username" required minlength="3" maxlength="32" autocomplete="username" placeholder="your_handle"></label>
        <label>密码<input v-model="form.password" required minlength="8" maxlength="128" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="至少 8 位字符"></label>
        <label v-if="mode === 'register'">邀请码<input v-model.trim="form.invite_code" required minlength="4" maxlength="64" autocomplete="off" placeholder="SYC-XXXX-XXXX-XXXX"><small>每个邀请码只能注册一个账号，请向核心组成员索取。</small></label>
        <p v-if="error" class="alert error">{{ error }}</p>
        <button class="primary wide" :disabled="loading">{{ loading ? '处理中…' : mode === 'login' ? '登录平台 →' : '注册并进入 →' }}</button>
      </form>
      <button class="switch-auth" @click="mode = mode === 'login' ? 'register' : 'login'; error = ''">
        {{ mode === 'login' ? '还没有账号？立即注册' : '已有账号？返回登录' }}
      </button>
    </div>
  </section>
</template>
