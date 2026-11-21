import { createRouter, createWebHashHistory } from 'vue-router'

// Every view is lazy. We resolve through import.meta.glob so a view that another
// workstream has not created yet does not break the whole router module: it
// falls back to the 404 view until the file exists (Vite picks it up on add).
const views = import.meta.glob('../views/*.vue')
const NotFound = () => import('../views/NotFoundView.vue')
const view = (name) => views[`../views/${name}.vue`] ?? NotFound

// meta.chrome: 'app' (top bar + tab bar), 'studio' (own bar, no global nav),
// 'print' (slim print toolbar, no global nav).
const routes = [
  { path: '/', name: 'team', component: view('TeamView'), meta: { title: 'Team', nav: 'team' } },
  { path: '/people/new', name: 'person-new', component: view('PersonNewView'), meta: { title: 'Add teammate', nav: 'add' } },
  { path: '/people/:id', name: 'person', component: view('PersonView'), meta: { title: 'Profile', nav: 'team' } },
  { path: '/people/:id/edit', name: 'person-edit', component: view('PersonEditView'), meta: { title: 'Edit teammate', nav: 'team' } },
  { path: '/people/:id/avatar', name: 'avatar-studio', component: view('AvatarStudioView'), meta: { title: 'Avatar Studio', chrome: 'studio' } },
  { path: '/people/:id/shirts', name: 'shirts', component: view('ShirtListView'), meta: { title: 'Shirts', nav: 'team' } },
  { path: '/people/:id/shirts/:designId', name: 'shirt-studio', component: view('ShirtStudioView'), meta: { title: 'Shirt Studio', chrome: 'studio' } },
  { path: '/team-shirt/:designId', name: 'team-shirt', component: view('ShirtStudioView'), props: { mode: 'team' }, meta: { title: 'Team shirt', chrome: 'studio' } },
  { path: '/quiz', name: 'quiz', component: view('QuizView'), meta: { title: 'Dino quiz', nav: 'quiz' } },
  { path: '/dinopedia', name: 'dinopedia', component: view('DinopediaView'), meta: { title: 'Dinopedia', nav: 'dinopedia' } },
  { path: '/dinopedia/:dinoId', name: 'dino', component: view('DinoDetailView'), meta: { title: 'Dinopedia', nav: 'dinopedia' } },
  { path: '/insights', name: 'insights', component: view('InsightsView'), meta: { title: 'Team insights', nav: 'insights' } },
  { path: '/insights/poster', name: 'poster', component: view('PosterView'), meta: { title: 'Team poster', chrome: 'print' } },
  { path: '/insights/name-cards', name: 'name-cards', component: view('NameCardsView'), meta: { title: 'Name cards', chrome: 'print' } },
  { path: '/design-system', name: 'design-system', component: view('DesignSystemView'), meta: { title: 'Design system' } },

  // Legacy links
  { path: '/add', redirect: '/people/new' },
  { path: '/person/:id', redirect: (to) => ({ path: `/people/${to.params.id}` }) },
  { path: '/person/:id/edit', redirect: (to) => ({ path: `/people/${to.params.id}/edit` }) },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound, meta: { title: 'Page not found' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    // Query-only changes (filters, tabs) keep the scroll position.
    if (to.path === from.path) return false
    if (to.hash && to.hash.length > 1 && !to.hash.startsWith('#/')) return { el: to.hash, top: 80 }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Dino Selector` : 'Dino Selector'
})

export default router
