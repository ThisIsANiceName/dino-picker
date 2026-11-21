// Cross-platform replacement for `NODE_ENV=production node server/index.js` (works in cmd/PowerShell).
process.env.NODE_ENV ??= 'production'
await import('./index.js')
