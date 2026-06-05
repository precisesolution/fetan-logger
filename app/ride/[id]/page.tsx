'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FLAG_TYPES = ['Bad Road', 'Blocked', 'One Way', 'Landmark', 'Congestion']

export default function RidePage() {
  const { id } = useParams()
  const [recording, setRecording] = useState(true)
  const [points, setPoints] = useState(0)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showFlags, setShowFlags] = useState(false)
  const [done, setDone] = useState(false)
  const watchId = useRef<number | null>(null)
  const startTime = useRef(Date.now())

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // GPS Recording
  useEffect(() => {
    if (!recording) return

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords

        await supabase.from('ride_points').insert({
          ride_id: id,
          lat: latitude,
          lng: longitude,
          accuracy,
          speed: speed ?? 0,
        })

        setPoints(p => p + 1)
        setAccuracy(accuracy)
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    )

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [recording, id])

  async function stopRide() {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
    setRecording(false)

    await supabase
      .from('rides')
      .update({ ended_at: new Date().toISOString(), total_points: points })
      .eq('id', id)

    setDone(true)
  }

  async function addFlag(type: string) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await supabase.from('ride_flags').insert({
        ride_id: id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        flag_type: type,
      })
      setShowFlags(false)
    })
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (done) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold">Ride Complete</h1>
          <div className="bg-zinc-900 rounded-xl p-6 space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-zinc-400">Duration</span>
              <span className="font-mono">{formatTime(elapsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">GPS Points</span>
              <span className="font-mono">{points}</span>
            </div>
          </div>
          <p className="text-zinc-500 text-sm">Data uploaded to Fetan database</p>
          <a href="/" className="block w-full bg-white text-black font-semibold py-4 rounded-lg text-lg text-center">
            New Ride
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-zinc-400 uppercase tracking-widest">Recording</span>
          </div>
          <div className="text-6xl font-mono font-bold">{formatTime(elapsed)}</div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">GPS Points</span>
            <span className="font-mono text-xl">{points}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Accuracy</span>
            <span className={`font-mono text-xl ${accuracy && accuracy < 10 ? 'text-green-400' : 'text-yellow-400'}`}>
              {accuracy ? `${Math.round(accuracy)}m` : '...'}
            </span>
          </div>
        </div>

        {showFlags && (
          <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Flag Issue</p>
            {FLAG_TYPES.map(type => (
              <button
                key={type}
                onClick={() => addFlag(type)}
                className="w-full text-left px-4 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
              >
                {type}
              </button>
            ))}
            <button
              onClick={() => setShowFlags(false)}
              className="w-full text-center px-4 py-3 text-zinc-500 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => setShowFlags(true)}
            className="w-full bg-zinc-800 text-white font-semibold py-4 rounded-lg text-lg hover:bg-zinc-700 transition"
          >
            🚩 Flag Issue
          </button>

          <button
            onClick={stopRide}
            className="w-full bg-red-600 text-white font-semibold py-4 rounded-lg text-lg hover:bg-red-700 transition"
          >
            ⏹ Stop Ride
          </button>
        </div>

      </div>
    </main>
  )
}