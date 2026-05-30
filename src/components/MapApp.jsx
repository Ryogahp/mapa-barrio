import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import kmlData from '../data/kml-data.json'

function pointInPolygon(lng, lat, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0], xi = polygon[i][1]
    const yj = polygon[j][0], xj = polygon[j][1]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function findTerritory(lat, lng, polygons) {
  for (const poly of polygons) {
    if (pointInPolygon(lng, lat, poly.coords)) return poly.name
  }
  return null
}

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createNumberedIcon(number, color = '#3949AB') {
  return L.divIcon({
    className: 'numbered-marker',
    html: `<div class="numbered-marker-inner" style="background:${color}">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

const numberedIconCache = {}

function getNumberedIcon(number, color) {
  const key = `${number}-${color}`
  if (!numberedIconCache[key]) {
    numberedIconCache[key] = createNumberedIcon(number, color)
  }
  return numberedIconCache[key]
}

const userIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function MapClickHandler({ onAddPoint }) {
  useMapEvents({
    click(e) {
      const name = window.prompt('Nombre del punto:')
      if (name !== null) {
        onAddPoint({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          name: name.trim() || 'Punto sin nombre',
        })
      }
    },
  })
  return null
}

function LocateUser() {
  const map = useMap()
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
        () => {},
        { timeout: 8000, enableHighAccuracy: false },
      )
    }
  }, [])
  return null
}

function MarkerPopup({ point }) {
  return (
    <Popup>
      <div className="popup-content">
        <p className="popup-name">{point.name}</p>
        {point.territory && (
          <p className="popup-territory">{point.territory}</p>
        )}
        <p className="popup-coords">
          {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </p>
      </div>
    </Popup>
  )
}

export default function MapApp() {
  const [userPoints, setUserPoints] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const polygons = useMemo(() => kmlData.polygons, [])

  useEffect(() => {
    fetchPoints()
    subscribeToChanges()
  }, [])

  async function fetchPoints() {
    setLoading(true)
    const { data, error } = await supabase
      .from('puntos')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setUserPoints(data)
    }
    setLoading(false)
  }

  function subscribeToChanges() {
    const channel = supabase
      .channel('puntos-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'puntos' },
        (payload) => {
          setUserPoints((prev) => {
            if (prev.some((p) => p.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'puntos' },
        (payload) => {
          setUserPoints((prev) =>
            prev.filter((p) => p.id !== payload.old.id),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const addPoint = useCallback(
    async ({ lat, lng, name }) => {
      const territory = findTerritory(lat, lng, polygons)
      const { error } = await supabase.from('puntos').insert({
        lat,
        lng,
        name,
        territory,
      })

      if (error) {
        console.error('Error guardando punto:', error)
        alert('Error al guardar el punto')
      }
    },
    [polygons],
  )

  const deletePoint = useCallback(async (id) => {
    const { error } = await supabase.from('puntos').delete().eq('id', id)

    if (error) {
      console.error('Error eliminando punto:', error)
      alert('Error al eliminar el punto')
    }
  }, [])

  return (
    <div className="map-app">
      <header className="app-header">
        <button
          className="icon-btn"
          onClick={() => setPanelOpen((o) => !o)}
          aria-label="Lista de puntos"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <h1 className="app-title">Mis Puntos</h1>
        <div className="icon-btn" />
      </header>

      <div className="map-wrapper">
        <MapContainer
          center={[-16.5, -68.09]}
          zoom={14}
          className="map-container"
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClickHandler onAddPoint={addPoint} />
          <LocateUser />

          {kmlData.polygons.map((poly, i) => (
            <Polygon
              key={`poly-${i}`}
              positions={poly.coords}
              pathOptions={{
                color: poly.color,
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.1,
                interactive: false,
              }}
            />
          ))}

          {kmlData.numberedPoints.map((pt, i) => (
            <Marker
              key={`num-${i}`}
              position={[pt.lat, pt.lng]}
              icon={getNumberedIcon(pt.number, pt.color)}
            />
          ))}

          {loading ? null : (
            userPoints.map((pt) => (
              <Marker key={pt.id} position={[pt.lat, pt.lng]} icon={userIcon}>
                <MarkerPopup point={pt} />
              </Marker>
            ))
          )}
        </MapContainer>
      </div>

      {panelOpen && (
        <div className="panel-overlay" onClick={() => setPanelOpen(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Puntos guardados</h2>
              <button
                className="icon-btn"
                onClick={() => setPanelOpen(false)}
                aria-label="Cerrar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="panel-body">
              <div className="panel-section">
                <p className="section-title">Mis puntos</p>
                {loading ? (
                  <p className="empty-state">Cargando...</p>
                ) : userPoints.length === 0 ? (
                  <p className="empty-state">Toca el mapa para añadir un punto</p>
                ) : (
                  userPoints.map((p) => (
                    <div key={p.id} className="point-row">
                      <div className="point-row-info">
                        <span className="point-row-name">{p.name}</span>
                        {p.territory && (
                          <span className="point-row-territory">{p.territory}</span>
                        )}
                        <span className="point-row-coords">
                          {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                        </span>
                      </div>
                      <button
                        className="point-row-delete"
                        onClick={() => deletePoint(p.id)}
                        aria-label={`Eliminar ${p.name}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
