import React, { useState } from 'react'
import { Search, Zap } from 'lucide-react'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

export default function DemoSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const clientIP = '192.168.1.' + Math.floor(Math.random() * 200 + 10) // demo: random client IP

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${SERVER}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, clientIP })
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ error: true, message: 'Network error' })
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-6 rounded-2xl bg-white shadow-soft border border-white/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <Search className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Demo Search</h1>
            <p className="text-sm text-gray-500">Post queries to the server; server will detect & block known attack patterns.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200"
            placeholder="Enter search or attack payload..."
          />
          <button onClick={handleSearch} disabled={loading} className="px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.blocked ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Quick Test Attacks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setQuery("' OR '1'='1")} className="text-left p-3 rounded-lg bg-gray-50 border">SQL Injection</button>
            <button onClick={() => setQuery('<script>alert("xss")</script>')} className="text-left p-3 rounded-lg bg-gray-50 border">XSS</button>
            <button onClick={() => setQuery('; cat /etc/passwd')} className="text-left p-3 rounded-lg bg-gray-50 border">Command Injection</button>
            <button onClick={() => setQuery('../../etc/passwd')} className="text-left p-3 rounded-lg bg-gray-50 border">Path Traversal</button>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white shadow-soft border border-white/60">
        <h2 className="text-lg font-bold mb-3">How this works</h2>
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
          <li>Search page POSTs {`/api/search`} on the server with your query and clientIP.</li>
          <li>Server runs detection — if malicious, it blocks, logs, and emits a live event via Socket.IO.</li>
          <li>Open the Dashboard page to see live attacks & blocked IPs appear instantly.</li>
        </ol>
      </div>
    </div>
  )
}
