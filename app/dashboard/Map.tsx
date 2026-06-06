'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Route = {
  id: string
  geometry: string
  status: string
  ride_count: number
  is_trusted_source: boolean
  last_ridden_at: string
}

type Props = {
  routes: Route[]
  statusColors: Record<string, string>
}

export default function Map({ routes, statusColors }: Props) {
  const center: [number, number] = [9.0300, 38.7469] // Addis Ababa center

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routes.map(route => {
        try {
          const coords: [number, number][][] = JSON.parse(route.geometry)
          const positions: [number, number][] = coords.map(c => [c[1], c[0]])
          const color = statusColors[route.status] || '#6b7280'

          return (
            <Polyline
              key={route.id}
              positions={positions}
              color={color}
              weight={route.status === 'confirmed' ? 4 : 3}
              opacity={route.status === 'candidate' ? 0.5 : 0.8}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  <strong style={{ textTransform: 'capitalize' }}>{route.status}</strong><br />
                  Rides: {route.ride_count}<br />
                  Trusted: {route.is_trusted_source ? 'Yes' : 'No'}<br />
                  Last ridden: {new Date(route.last_ridden_at).toLocaleDateString()}
                </div>
              </Popup>
            </Polyline>
          )
        } catch {
          return null
        }
      })}
    </MapContainer>
  )
}