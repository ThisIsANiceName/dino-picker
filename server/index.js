import { createApp } from './app.js'

const PORT = Number(process.env.PORT ?? 3001)
const app = createApp()
const server = app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`))

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => { app.locals.close(); process.exit(0) })
    setTimeout(() => process.exit(0), 3000).unref()
  })
}
