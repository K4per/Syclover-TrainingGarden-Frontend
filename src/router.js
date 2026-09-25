import { createRouter, createWebHistory } from 'vue-router'
import { session } from './api'
import LoginView from './views/LoginView.vue'
import DashboardView from './views/DashboardView.vue'
import ChallengesView from './views/ChallengesView.vue'
import ChallengeView from './views/ChallengeView.vue'
import DefenseView from './views/DefenseView.vue'
import ScoreboardView from './views/ScoreboardView.vue'
import AdminView from './views/AdminView.vue'
import PracticeHallView from './views/PracticeHallView.vue'
import ProfileView from './views/ProfileView.vue'
import CollectionsView from './views/CollectionsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', component: DashboardView },
    { path: '/challenges', redirect: '/practice' },
    { path: '/practice', component: PracticeHallView },
    { path: '/sets', component: CollectionsView },
    { path: '/sets/:id', component: CollectionsView },
    { path: '/ctf', component: ChallengesView, meta: { mode: 'ctf' } },
    { path: '/ctf/:id', component: ChallengeView },
    { path: '/awdp', component: ChallengesView, meta: { mode: 'awdp' } },
    { path: '/awdp/:id', component: DefenseView },
    { path: '/defense', redirect: '/awdp' },
    { path: '/scoreboard', component: ScoreboardView },
    { path: '/profile', component: ProfileView },
    { path: '/profile/:id', component: ProfileView },
    { path: '/admin', component: AdminView, meta: { admin: true } },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.public && !session.token) return '/login'
  if (to.path === '/login' && session.token) return '/'
  if (to.meta.admin && !['admin', 'root_admin'].includes(session.user?.role)) return '/'
})

export default router
