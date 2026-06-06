'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Load map dynamically — leaflet doesn't work with server rendering
const Map = dynamic(() => import('./Map'), { ssr: false })

type Route = {
  id: string
  geometry: string
  status: 'candidate' | 'potential' | 'likely' | 'confirmed' | 'flagged'
  ride_count: number
  is_trusted_source: boolean
  last_ridden_at: string
}

type Stats = {
  total_rides: number
  confirmed: number
  likely: number
  potential: number
  candidate: number
  flagged: number
}

const STATUS_COLORS = {
  candidate: '#6b7280',   // gray
  potential: '#eab308',   // yellow
  likely: '#f97316',      // orange
  confirmed: '#000000',   // black
  flagged: '#ef4444',     // red
}

const STATUS_LABELS = {
  candidate: 'Candidate',
  potential: 'Potential',
  likely: 'Likely',
  confirmed: 'Confirmed',
  flagged: 'Flagged',
}

export default function Dashboard() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    // Fetch routes
    const { data: routeData } = await supabase
      .from('candidate_routes')
      .select('*')
      .order('created_at', { ascending: false })

    // Fetch stats
    const { data: rideData } = await supabase
      .from('rides')
      .select('id, processed')

    const { data: segmentData } = await supabase
      .from('candidate_routes')
      .select('status')

    if (routeData) setRoutes(routeData)

    if (rideData && segmentData) {
      const statusCounts = segmentData.reduce((acc: any, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1
        return acc
      }, {})

      setStats({
        total_rides: rideData.length,
        confirmed: statusCounts.confirmed || 0,
        likely: statusCounts.likely || 0,
        potential: statusCounts.potential || 0,
        candidate: statusCounts.candidate || 0,
        flagged: statusCounts.flagged || 0,
      })
    }

    setLoading(false)
  }

  const filteredRoutes = filter === 'all'
    ? routes
    : routes.filter(r => r.status === filter)

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Fetan Map Dashboard</h1>
          <p className="text-zinc-500 text-sm">Live route discovery — Addis Ababa & Sheger</p>
        </div>
        <div className="text-zinc-500 text-xs">
          Auto-refreshes every 30s
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">

        {/* Left panel — stats + filters */}
        <div className="w-72 border-r border-zinc-800 p-4 space-y-6 overflow-y-auto">

          {/* Stats */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Overview</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                <span className="text-zinc-400 text-sm">Total Rides</span>
                <span className="font-mono font-bold">{stats?.total_rides ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Route status breakdown */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Routes</p>
            <div className="space-y-2">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <button
                  key={status}
                  onClick={() => setFilter(filter === status ? 'all' : status)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                    filter === status ? 'bg-zinc-700' : 'hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm capitalize">{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</span>
                  </div>
                  <span className="font-mono text-sm text-zinc-400">
                    {stats?.[status as keyof Stats] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Legend</p>
            <div className="space-y-2 text-xs text-zinc-400">
              <p>⬤ <span className="text-zinc-500">Gray</span> — new, unverified</p>
              <p>⬤ <span className="text-yellow-500">Yellow</span> — trusted or 3+ rides</p>
              <p>⬤ <span className="text-orange-500">Orange</span> — 4 rides, likely real</p>
              <p>⬤ <span className="text-white">Black</span> — confirmed route</p>
              <p>⬤ <span className="text-red-500">Red</span> — flagged / inactive</p>
            </div>
          </div>

          {/* Recent routes */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Recent Discoveries</p>
            <div className="space-y-2">
              {routes.slice(0, 5).map(route => (
                <div key={route.id} className="bg-zinc-900 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[route.status] }}
                      />
                      <span className="text-xs capitalize">{route.status}</span>
                    </div>
                    {route.is_trusted_source && (
                      <span className="text-xs text-blue-400">trusted</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{route.ride_count} ride{route.ride_count !== 1 ? 's' : ''}</p>
                </div>
              ))}
              {routes.length === 0 && (
                <p className="text-zinc-600 text-xs">No routes discovered yet. Start riding!</p>
              )}
            </div>
          </div>

        </div>

        {/* Right panel — map */}
        <div className="flex-1">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-500">
              Loading map...
            </div>
          ) : (
            <Map routes={filteredRoutes} statusColors={STATUS_COLORS} />
          )}
        </div>

      </div>
    </main>
  )
}