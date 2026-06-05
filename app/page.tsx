'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [riderName, setRiderName] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number; area: string } | null>(null)
  const [locating, setLocating] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords

        // Reverse geocode using OpenStreetMap Nominatim
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        )
        const data = await res.json()

        const area =
          data.address?.suburb ||
          data.address?.neighbourhood ||
          data.address?.city_district ||
          data.address?.town ||
          data.address?.city ||
          'Unknown Area'

        setLocation({ lat: latitude, lng: longitude, area })
        setLocating(false)
      },
      () => {
        setLocating(false)
      },
      { enableHighAccuracy: true }
    )
  }, [])

  async function startRide() {
    if (!riderName) return alert('Enter your name first')
    if (!location) return alert('Location not detected yet')
    setLoading(true)

    const { data, error } = await supabase
      .from('rides')
      .insert({
        rider_name: riderName,
        area: location.area,
        start_lat: location.lat,
        start_lng: location.lng,
      })
      .select()
      .single()

    if (error) {
      alert('Error starting ride: ' + error.message)
      setLoading(false)
      return
    }

    router.push(`/ride/${data.id}`)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Fetan Logger</h1>
          <p className="text-zinc-400 text-sm">Record your ride. Build the map.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 uppercase tracking-widest">Rider Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={riderName}
              onChange={e => setRiderName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-400 uppercase tracking-widest">Detected Location</p>
            {locating ? (
              <p className="text-zinc-500 text-sm animate-pulse">Detecting your location...</p>
            ) : location ? (
              <div>
                <p className="text-white font-medium">{location.area}</p>
                <p className="text-zinc-500 text-xs font-mono">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
              </div>
            ) : (
              <p className="text-red-400 text-sm">Location access denied. Please enable it.</p>
            )}
          </div>
        </div>

        <button
          onClick={startRide}
          disabled={loading || locating || !location}
          className="w-full bg-white text-black font-semibold py-4 rounded-lg text-lg hover:bg-zinc-200 transition disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Start Ride'}
        </button>

      </div>
    </main>
  )
}