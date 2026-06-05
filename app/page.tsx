'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number; area: string } | null>(null)
  const [locating, setLocating] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
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
      () => setLocating(false),
      { enableHighAccuracy: true }
    )
  }, [])

  async function startRide() {
    if (!location) return
    setLoading(true)

    const { data, error } = await supabase
      .from('rides')
      .insert({
        area: location.area,
        start_lat: location.lat,
        start_lng: location.lng,
      })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
      return
    }

    router.push(`/ride/${data.id}`)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Fetan</h1>
          <p className="text-zinc-400 text-sm">Building the map of Ethiopia.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Your Location</p>
          {locating ? (
            <p className="text-zinc-400 animate-pulse">Detecting...</p>
          ) : location ? (
            <div>
              <p className="text-white font-medium">{location.area}</p>
              <p className="text-zinc-600 text-xs font-mono mt-0.5">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </p>
            </div>
          ) : (
            <p className="text-red-400 text-sm">Location access denied. Enable it to continue.</p>
          )}
        </div>

        <button
          onClick={startRide}
          disabled={loading || locating || !location}
          className="w-full bg-white text-black font-bold py-5 rounded-xl text-xl hover:bg-zinc-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : locating ? 'Getting location...' : 'START'}
        </button>

      </div>
    </main>
  )
}