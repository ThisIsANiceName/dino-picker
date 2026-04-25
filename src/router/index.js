import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AddPersonView from '../views/AddPersonView.vue'
import EditPersonView from '../views/EditPersonView.vue'
import PersonDetailView from '../views/PersonDetailView.vue'
import QuizView from '../views/QuizView.vue'

const routes = [
  { path: '/', component: HomeView, meta: { title: 'Roster' } },
  { path: '/add', component: AddPersonView, meta: { title: 'Add Person' } },
  { path: '/person/:id/edit', component: EditPersonView, meta: { title: 'Edit Person' } },
  { path: '/person/:id', component: PersonDetailView, meta: { title: 'Person Detail' } },
  { path: '/quiz', component: QuizView, meta: { title: 'Dino Quiz' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — Dino Selector` : 'Dino Selector'
})

export default router
