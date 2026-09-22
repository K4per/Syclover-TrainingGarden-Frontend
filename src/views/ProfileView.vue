<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, session, setSession } from '../api'
import ThemeIcon from '../components/ThemeIcon.vue'

const route = useRoute()
const profile = ref(null)
const catalog = ref([])
const loading = ref(true)
const saving = ref(false)
const changingPassword = ref(false)
const error = ref('')
const notice = ref('')
const edit = reactive({ avatar_url: '', signature: '', direction: '' })
const password = reactive({ current_password: '', new_password: '', confirm_password: '' })
const directions = ['Web', 'Pwn', 'Reverse', 'Crypto', 'Misc']

const profileId = computed(() => route.params.id || session.user?.id)
const isOwnProfile = computed(() => !route.params.id || route.params.id === session.user?.id)
const displayAchievements = computed(() => profile.value?.achievements || [])

function syncSession(updated) {
  if (!isOwnProfile.value || !session.user) return
  setSession({ access_token: session.token, user: { ...session.user, ...updated } })
}

function fillEdit() {
  if (!profile.value || !isOwnProfile.value) return
  edit.avatar_url = profile.value.avatar_url || ''
  edit.signature = profile.value.signature || ''
  edit.direction = profile.value.direction || ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [loadedProfile, loadedCatalog] = await Promise.all([
      api(isOwnProfile.value ? '/users/me/profile' : `/users/${profileId.value}/profile`),
      api('/users/achievements/catalog'),
    ])
    profile.value = loadedProfile
    catalog.value = loadedCatalog
    fillEdit()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const updated = await api('/users/me/profile', {
      method: 'PATCH',
      body: {
        avatar_url: edit.avatar_url.trim() || null,
        signature: edit.signature.trim() || null,
        direction: edit.direction || null,
      },
    })
    profile.value = updated
    fillEdit()
    syncSession(updated)
    notice.value = '个人资料已保存'
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (password.new_password !== password.confirm_password) {
    error.value = '两次输入的新密码不一致'
    return
  }
  changingPassword.value = true
  error.value = ''
  notice.value = ''
  try {
    await api('/users/me/password', { method: 'POST', body: {
      current_password: password.current_password,
      new_password: password.new_password,
    } })
    Object.assign(password, { current_password: '', new_password: '', confirm_password: '' })
    notice.value = '密码已重置，下次登录请使用新密码'
  } catch (err) {
    error.value = err.message
  } finally {
    changingPassword.value = false
  }
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<template>
  <section>
    <div v-if="loading" class="empty">正在加载个人主页…</div>
    <template v-else-if="profile">
      <div class="profile-hero panel">
        <div class="profile-identity">
          <div class="profile-avatar large">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="`${profile.username} 的头像`">
            <span v-else>{{ profile.username.slice(0, 1).toUpperCase() }}</span>
          </div>
          <div>
            <p class="eyebrow">PLAYER PROFILE · {{ profile.role === 'root_admin' ? 'ROOT ADMIN' : profile.role === 'admin' ? 'ADMIN' : 'MEMBER' }}</p>
            <h1>{{ profile.username }}<span class="accent">.</span></h1>
            <p class="profile-signature">{{ profile.signature || '还没有写下签名。' }}</p>
            <div class="profile-meta">
              <span v-if="profile.direction"><ThemeIcon :category="profile.direction" :size="14" />{{ profile.direction }} 方向</span>
              <span>加入于 {{ new Date(profile.created_at).toLocaleDateString('zh-CN') }}</span>
            </div>
          </div>
        </div>
        <RouterLink v-if="!isOwnProfile" class="secondary" to="/profile">我的主页</RouterLink>
      </div>

      <p v-if="error" class="alert error">{{ error }}</p>
      <p v-if="notice" class="alert success">{{ notice }}</p>

      <div class="profile-stats stat-grid">
        <article class="stat-card"><span>当前积分</span><strong>{{ profile.score }}<small>PTS</small></strong><p>累计有效解题得分</p></article>
        <article class="stat-card"><span>已解题目</span><strong>{{ profile.solves }}<small>SOLVES</small></strong><p>完成过的训练目标</p></article>
        <article class="stat-card"><span>全站排名</span><strong>{{ profile.rank || '—' }}<small v-if="profile.rank">RANK</small></strong><p>{{ profile.rank ? '按当前积分计算' : '完成题目后上榜' }}</p></article>
        <article class="stat-card"><span>训练方向</span><strong class="profile-direction-stat">{{ profile.direction || '未设置' }}</strong><p>可在资料设置中修改</p></article>
      </div>

      <div class="profile-layout">
        <div class="profile-main">
          <section class="panel achievement-panel">
            <div class="section-heading"><div><p class="eyebrow">ACHIEVEMENTS</p><h2>成就徽章</h2></div><span class="achievement-count">{{ displayAchievements.length }} / {{ catalog.length }}</span></div>
            <div v-if="displayAchievements.length" class="achievement-grid">
              <article v-for="achievement in displayAchievements" :key="achievement.slug" class="achievement-badge">
                <div :class="['achievement-icon', `achievement-${achievement.icon}`]">
                  <svg v-if="achievement.icon === 'sprout'" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27V15M16 16C10 16 7 12.5 7 7c5.5 0 9 3 9 9ZM16 20c6 0 9-3.5 9-9-5.5 0-9 3-9 9Z" /></svg>
                  <svg v-else-if="achievement.icon === 'peak-geek'" viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 3.3 6.7 7.4 1.1-5.3 5.2 1.3 7.4-6.7-3.5-6.7 3.5 1.3-7.4-5.3-5.2 7.4-1.1Z" /><path d="M10 28h12M13 24v4m6-4v4" /></svg>
                  <svg v-else viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 19 8l5 .5-2.8 3.8 1.2 4.8-4.4-1.7-4.1 2.2.4-4.9L11 9.2l4.8-.9Z" /><path d="m9 19 2.5 3.5L16 21l4.5 1.5L23 19l-1 6H10Z" /></svg>
                </div>
                <div><h3>{{ achievement.name }}</h3><p class="achievement-description">{{ achievement.description }}</p><strong class="achievement-acquisition">{{ achievement.acquisition }}</strong><small>{{ achievement.awarded_at ? new Date(achievement.awarded_at).toLocaleDateString('zh-CN') : '已获得' }}</small></div>
              </article>
            </div>
            <div v-else class="empty">还没有获得成就徽章。</div>
          </section>

          <section v-if="isOwnProfile" class="panel profile-form-panel">
            <div class="form-heading"><p class="eyebrow">PROFILE SETTINGS</p><h2>编辑个人资料</h2></div>
            <form class="form-grid" @submit.prevent="saveProfile">
              <label class="span-2">头像地址<input v-model="edit.avatar_url" type="url" maxlength="500" placeholder="https://example.com/avatar.png"><small>使用公开可访问的图片地址，留空可移除头像。</small></label>
              <label>训练方向<select v-model="edit.direction"><option value="">暂不设置</option><option v-for="direction in directions" :key="direction" :value="direction">{{ direction }}</option></select></label>
              <label class="span-2">个性签名<textarea v-model="edit.signature" maxlength="160" rows="3" placeholder="写一句你的训练宣言…" /></label>
              <div class="span-2 form-actions"><button class="primary" :disabled="saving" type="submit">{{ saving ? '保存中…' : '保存资料' }}</button></div>
            </form>
          </section>
        </div>

        <aside v-if="isOwnProfile" class="panel password-panel">
          <div class="form-heading"><p class="eyebrow">ACCOUNT SECURITY</p><h2>重置密码</h2></div>
          <form class="password-form" @submit.prevent="changePassword">
            <label>当前密码<input v-model="password.current_password" type="password" minlength="8" required autocomplete="current-password"></label>
            <label>新密码<input v-model="password.new_password" type="password" minlength="8" required autocomplete="new-password"></label>
            <label>确认新密码<input v-model="password.confirm_password" type="password" minlength="8" required autocomplete="new-password"></label>
            <button class="secondary wide" :disabled="changingPassword" type="submit">{{ changingPassword ? '更新中…' : '更新密码' }}</button>
          </form>
        </aside>
      </div>
    </template>
    <p v-else-if="error" class="alert error">{{ error }}</p>
  </section>
</template>
