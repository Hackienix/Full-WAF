import React, { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Lock, Unlock, Activity } from 'lucide-react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

export default function WAFDashboard() {
  const [attacks, setAttacks] = useState([])
  const [blockedIPs, setBlockedIPs] = useState([])
  const [stats, setStats] = useState({ totalAttacks: 0, blockedRequests: 0 })
  const socketRef = React.useRef(null)

  useEffect(() => {
    // fetch initial state
    fetch(`${SERVER}/api/state`).then(r => r.json()).then(data => {
      setAttacks(data.attacks || [])
      setBlockedIPs(data.blockedIPs || [])
      setStats(data.stats || { totalAttacks: 0, blockedRequests: 0 })
    }).catch(() => {})

    // connect socket.io
    const s = io(SERVER)
    socketRef.current = s

    s.on('connect', () => console.log('connected to WAF server', s.id))
    s.on('init', (payload) => {
      setAttacks(payload.attacks || [])
      setBlockedIPs(payload.blockedIPs || [])
    })
    s.on('attack', (log) => {
      setAttacks(prev => [log, ...prev].slice(0, 50))
      setStats(prev => ({ ...prev, totalAttacks: prev.totalAttacks + 1 }))
    })
    s.on('blocked_ips', (list) => {
      setBlockedIPs(list)
      setStats(prev => ({ ...prev, blockedRequests: list.length }))
    })

    return () => s.disconnect()
  }, [])

  async function simulate(payload, type) {
    try {
      await fetch(`${SERVER}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, type })
      })
      // server will emit attack event -> handled by socket listener
    } catch (err) {
      console.error(err)
    }
  }

  async function unblock(ip) {
    // For demo, just remove locally; in production you'd call server to remove block
    setBlockedIPs(prev => prev.filter(b => b.ip !== ip))
  }

  const testAttacks = [
    { name: 'SQL Injection', payload: "' OR '1'='1", type: 'sqlInjection' },
    { name: 'XSS', payload: '<script>alert(1)</script>', type: 'xss' },
    { name: 'Command', payload: '; cat /etc/passwd', type: 'commandInjection' }
  ]

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-purple-50 shadow-soft border border-white/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white shadow-inset"><Shield className="w-6 h-6 text-purple-600" /></div>
            <div>
              <h2 className="text-2xl font-bold">WAF Dashboard</h2>
              <p className="text-sm text-gray-500">Live simulation of blocked attacks</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">Status: <span className="ml-2 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">Live</span></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-white shadow-soft border">
            <div className="flex items-center gap-2 text-sm text-gray-500"><AlertTriangle className="w-4 h-4 text-red-500"/> Total Attacks</div>
            <div className="text-2xl font-bold mt-2">{stats.totalAttacks}</div>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-soft border">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Lock className="w-4 h-4 text-yellow-500"/> Blocked Requests</div>
            <div className="text-2xl font-bold mt-2">{stats.blockedRequests}</div>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-soft border">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Activity className="w-4 h-4 text-blue-500"/> Blocked IPs</div>
            <div className="text-2xl font-bold mt-2">{blockedIPs.length}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-4 rounded-lg bg-white border shadow-soft">
            <h3 className="font-semibold mb-2">Live Attack Feed</h3>
            <div className="max-h-72 overflow-y-auto">
              {attacks.length === 0 ? <div className="text-sm text-gray-500">No attacks yet.</div> : attacks.map(a => (
                <div key={a.id} className="p-3 border-b last:border-b-0">
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span className="font-mono">{a.ip}</span><span>{new Date(a.timestamp).toLocaleTimeString()}</span></div>
                  <div className="text-sm font-medium">{a.attackType}</div>
                  <div className="text-xs mt-1 font-mono truncate">{a.payload}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border shadow-soft">
            <h3 className="font-semibold mb-2">Simulate Attacks</h3>
            <div className="space-y-2">
              {testAttacks.map((t,i) => (
                <button key={i} onClick={() => simulate(t.payload, t.type)} className="w-full text-left p-2 rounded-lg bg-purple-50 hover:bg-purple-100">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs mt-1 text-gray-500 font-mono truncate">{t.payload}</div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Blocked IPs</h4>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {blockedIPs.length === 0 ? <div className="text-sm text-gray-500">No blocked IPs</div> : blockedIPs.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-mono text-sm">{b.ip}</div>
                      <div className="text-xs text-gray-500">{b.reason}</div>
                    </div>
                    <button onClick={() => unblock(b.ip)} className="text-sm text-green-600">Unblock</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-white shadow-soft border">
        <h3 className="font-semibold mb-2">How to Use</h3>
        <ol className="list-decimal list-inside text-sm space-y-2 text-gray-700">
          <li>Open <strong>Demo Search</strong> and send a payload to the server.</li>
          <li>Server detects and emits live events; Dashboard shows live feed.</li>
          <li>Use <strong>Simulate Attacks</strong> in the dashboard to trigger server-side events.</li>
        </ol>
      </div>
    </div>
  )
}
