const fs = require('fs')
const path = require('path')

const dataDir = path.join(__dirname, '..', 'src', 'data')

// --- Parse territorios.kml (polygons) ---
function parsePolygons(xml) {
  const polygons = []
  const pmRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g
  let pmMatch
  while ((pmMatch = pmRegex.exec(xml)) !== null) {
    const pc = pmMatch[1]
    const nm = pc.match(/<name>([^<]*)<\/name>/)
    const name = nm ? nm[1].trim() : ''

    const polyMatch = pc.match(
      /<Polygon>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Polygon>/,
    )
    if (polyMatch) {
      const lines = polyMatch[1].trim().split(/\s+/).filter(Boolean)
      const coords = lines.map((l) => {
        const p = l.split(',')
        return [parseFloat(p[1]), parseFloat(p[0])]
      })
      const su = pc.match(/<styleUrl>#([^<]+)/)
      let color = '#2563eb'
      if (su) {
        const m = su[1].match(/poly-([^-]+)/)
        if (m) color = '#' + m[1]
      }
      polygons.push({ name, coords, color })
    }
  }
  return polygons
}

// --- Parse numeracion.kml (numbered points) ---
function parseNumberedPoints(xml) {
  const points = []
  const pmRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g
  let pmMatch
  while ((pmMatch = pmRegex.exec(xml)) !== null) {
    const pc = pmMatch[1]
    const nm = pc.match(/<name>([^<]*)<\/name>/)
    const name = nm ? nm[1].trim() : ''

    const ptMatch = pc.match(/<Point>[\s\S]*?<coordinates>([^<]*)<\/coordinates>[\s\S]*?<\/Point>/)
    if (ptMatch) {
      const parts = ptMatch[1].trim().split(',')
      const lng = parseFloat(parts[0])
      const lat = parseFloat(parts[1])

      const su = pc.match(/<styleUrl>#icon-seq2-0-(\d+)/)
      let number = 0
      let color = '#3949AB'
      if (su) {
        number = parseInt(su[1], 10) + 1
      }

      points.push({ name, lat, lng, number, color })
    }
  }
  return points
}

// --- Main ---
const territoriosRaw = fs.readFileSync(path.join(dataDir, 'territorios.kml'), 'utf-8')
const numeracionRaw = fs.readFileSync(path.join(dataDir, 'numeracion.kml'), 'utf-8')

const polygons = parsePolygons(territoriosRaw)
const numberedPoints = parseNumberedPoints(numeracionRaw)

fs.writeFileSync(
  path.join(dataDir, 'kml-data.json'),
  JSON.stringify({ polygons, numberedPoints }, null, 2),
)

console.log(`Polygons: ${polygons.length}`)
console.log(`Numbered points: ${numberedPoints.length}`)
console.log(`→ ${path.join(dataDir, 'kml-data.json')}`)
