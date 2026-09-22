<script setup>
import ThemeIcon from '../components/ThemeIcon.vue'

const practiceTracks = [
  {
    mode: 'ctf',
    eyebrow: 'CAPTURE THE FLAG',
    title: 'CTF 题库',
    description: '从 Web、Pwn、逆向、密码学和 Misc 题目中选择目标，启动独立环境并提交 Flag。',
    to: '/ctf',
    accent: 'theme-web',
    icon: 'all',
    action: '进入 CTF 题库',
  },
  {
    mode: 'awdp',
    eyebrow: 'ATTACK WITH DEFENSE PATCH',
    title: 'AWDP 题库',
    description: '在真实服务环境中定位漏洞、完成修复并用 Check 脚本验证防守效果。',
    to: '/awdp',
    accent: 'theme-pwn',
    icon: 'pwn',
    action: '进入 AWDP 题库',
  },
]
</script>

<template>
  <section>
    <div class="page-heading practice-heading">
      <div>
        <p class="eyebrow">TRAINING HUB · ALPHA 0.0.6</p>
        <h1>练习大厅<span class="accent">.</span></h1>
        <p class="lead">选择训练模式，进入对应题库。两种模式独立计分，训练记录会同步到个人主页。</p>
      </div>
    </div>

    <div class="practice-grid">
      <RouterLink
        v-for="track in practiceTracks"
        :key="track.mode"
        :to="track.to"
        :class="['practice-card', track.accent]"
      >
        <div class="practice-card-top">
          <span class="practice-icon"><ThemeIcon :category="track.icon" :size="54" /></span>
          <span class="practice-mode">{{ track.mode.toUpperCase() }}</span>
        </div>
        <p class="eyebrow">{{ track.eyebrow }}</p>
        <h2>{{ track.title }}</h2>
        <p class="muted">{{ track.description }}</p>
        <span class="practice-action">{{ track.action }} <span aria-hidden="true">→</span></span>
      </RouterLink>
    </div>

    <div class="practice-note panel">
      <span class="practice-note-mark">+</span>
      <div>
        <p class="eyebrow">TRAINING RECORD</p>
        <h2>每一次完成都会留下记录</h2>
        <p class="muted">解题数量、积分、排名和获得的成就会在个人主页持续更新。</p>
      </div>
      <RouterLink class="secondary" to="/profile">查看我的主页 →</RouterLink>
    </div>
  </section>
</template>
