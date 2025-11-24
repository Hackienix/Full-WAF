// Simple WAF server with Socket.IO live updates
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(bodyParser.json())

// Server-side regex patterns (extend for production)
const attackPatterns = {
  sqlInjection: [/(%27)|(\')|(\-\-)|(%23)|(#)/i, /union.*select/i, /exec(\s|\+)+(s|x)p\w+/i, /or\s+1\s*=\s*1/i],
  xss: [/<script[^>]*>.*?<\/script>/i, /javascript:/i, /onerror\s*=/i, /onload\s*=/i, /alert\s*\(/i],
  commandInjection: [/;.*rm\s+-rf/i, /\|.*cat\s+/i, /&&.*ls/i, /`.*`/, /\$\(.+\)/],
  pathTraversal: [/(\.\.\/)|(\.\.\\)/, /\/etc\/passwd/i, /\\windows\\system32/i]
}

function detectAttack(payload) {
  const s = String(payload)
  for (const [type, patterns] of Object.entries(attackPatterns)) {
    for (const p of patterns) if (p.test(s)) return { detected: true, type }
  }
  return { detected: false }
}

// In-memory store (demo only)
const attacks = []       // latest attacks (most recent first)
const blockedIPs = []    // { ip, reason, blockedAt, expiresAt }

// Helper: purge expired blocks (optional, demo)
setInterval(() => {
  const now = Date.now()
  for (let i = blockedIPs.length - 1; i >= 0; i--) {
    if (blockedIPs[i].expiresAt <= now) blockedIPs.splice(i, 1)
  }
}, 60 * 1000)

// POST /api/search
// body: { query, clientIP }
app.post('/api/search', (req, res) => {
  const { query, clientIP } = req.body || {}
  if (!query) return res.status(400).json({ error: 'query required' })

  // check blocked
  const blocked = blockedIPs.find(b => b.ip === clientIP)
  if (blocked) return res.json({ blocked: true, message: 'IP blocked', blockedUntil: blocked.expiresAt })

  const detection = detectAttack(query)
  if (detection.detected) {
    const ip = clientIP || ('10.0.0.' + Math.floor(Math.random() * 200 + 10))
    const log = { id: Date.now() + Math.random(), ip, payload: query, attackType: detection.type, timestamp: new Date().toISOString() }
    attacks.unshift(log)
    if (attacks.length > 200) attacks.pop()

    blockedIPs.push({ ip, reason: detection.type, blockedAt: Date.now(), expiresAt: Date.now() + 3600_000 }) // blocked 1 hour

    // emit live updates
    io.emit('attack', log)
    io.emit('blocked_ips', blockedIPs)

    return res.json({ blocked: true, message: 'Detected and blocked (server)', log })
  }

  // not malicious -> return fake results
  return res.json({ success: true, results: ['Result 1 for ' + query, 'Result 2 for ' + query] })
})

// POST /api/simulate
// body: { payload, type }
app.post('/api/simulate', (req, res) => {
  const { payload, type } = req.body || {}
  const ip = '10.0.0.' + Math.floor(Math.random() * 200 + 10)
  const log = { id: Date.now() + Math.random(), ip, payload: payload || '(sim)', attackType: type || 'simulated', timestamp: new Date().toISOString() }
  attacks.unshift(log)
  if (attacks.length > 200) attacks.pop()
  blockedIPs.push({ ip, reason: type || 'simulated', blockedAt: Date.now(), expiresAt: Date.now() + 3600_000 })

  io.emit('attack', log)
  io.emit('blocked_ips', blockedIPs)

  return res.json({ ok: true, log })
})

// GET /api/state - initial state
app.get('/api/state', (req, res) => {
  const stats = { totalAttacks: attacks.length, blockedRequests: blockedIPs.length }
  res.json({ attacks: attacks.slice(0, 50), blockedIPs, stats })
})

// Socket.IO
io.on('connection', socket => {
  console.log('socket connected', socket.id)
  socket.emit('init', { attacks: attacks.slice(0, 50), blockedIPs })
})

const PORT = process.env.PORT || 4000
server.listen(PORT, () => console.log('WAF server running on port', PORT))
