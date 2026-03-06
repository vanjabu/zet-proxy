const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const AdmZip = require('adm-zip');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());

const ZET_FEED_URL = 'https://zet.hr/gtfs-rt-protobuf';
const ZET_STATIC_URL = 'https://zet.hr/gtfs-scheduled/latest';

let cache = { vehicles: null, lastFetch: 0 };
const CACHE_TTL = 30 * 1000;

let stops = [];
let stopsLoaded = false;
let shapes = {};
let routeShapes = {};
let shapesLoaded = false;

// ── FETCH HELPER ──
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 };
    client.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// ── DISTANCE (metres) ──
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── NEAREST STOP ──
function nearestStop(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const s of stops) {
    const d = distanceM(lat, lng, s.lat, s.lng);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return { stop: best, dist: Math.round(bestDist) };
}

// ── LOAD GTFS STATIC (stops + shapes) ──
async function loadGtfsStatic() {
  try {
    console.log('[GTFS] Downloading static data...');
    const buf = await fetchBuffer(ZET_STATIC_URL);
    console.log(`[GTFS] Downloaded ${buf.length} bytes`);
    const zip = new AdmZip(buf);

    // --- STOPS ---
    const stopsEntry = zip.getEntry('stops.txt');
    if (stopsEntry) {
      const csv = stopsEntry.getData().toString('utf8');
      const lines = csv.split('\n');
      const header = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
      const latIdx = header.indexOf('stop_lat');
      const lngIdx = header.indexOf('stop_lon');
      const nameIdx = header.indexOf('stop_name');
      const idIdx = header.indexOf('stop_id');

      stops = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g,''));
        if (cols.length < 3) continue;
        const lat = parseFloat(cols[latIdx]);
        const lng = parseFloat(cols[lngIdx]);
        if (isNaN(lat) || isNaN(lng)) continue;
        stops.push({ id: cols[idIdx], name: cols[nameIdx], lat, lng });
      }
      stopsLoaded = true;
      console.log(`[GTFS] Loaded ${stops.length} stops`);
    }

    // --- SHAPES ---
    const shapesEntry = zip.getEntry('shapes.txt');
    if (shapesEntry) {
      const csv = shapesEntry.getData().toString('utf8');
      const lines = csv.split('\n');
      const header = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
      const shapeIdIdx = header.indexOf('shape_id');
      const latIdx = header.indexOf('shape_pt_lat');
      const lngIdx = header.indexOf('shape_pt_lon');
      const seqIdx = header.indexOf('shape_pt_sequence');

      const raw = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g,''));
        if (cols.length < 3) continue;
        const id = cols[shapeIdIdx];
        const lat = parseFloat(cols[latIdx]);
        const lng = parseFloat(cols[lngIdx]);
        const seq = parseInt(cols[seqIdx]);
        if (isNaN(lat) || isNaN(lng)) continue;
        if (!raw[id]) raw[id] = [];
        raw[id].push({ lat, lng, seq });
      }

      shapes = {};
      for (const id in raw) {
        raw[id].sort((a, b) => a.seq - b.seq);
        shapes[id] = raw[id].map(p => [p.lat, p.lng]);
      }
      console.log(`[GTFS] Loaded ${Object.keys(shapes).length} shapes`);
    }

    // --- TRIPS (routeId → shapeId mapping) ---
    const tripsEntry = zip.getEntry('trips.txt');
    if (tripsEntry) {
      const csv = tripsEntry.getData().toString('utf8');
      const lines = csv.split('\n');
      const header = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
      const routeIdx = header.indexOf('route_id');
      const shapeIdx = header.indexOf('shape_id');

      routeShapes = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g,''));
        if (cols.length < 2) continue;
        const routeId = cols[routeIdx];
        const shapeId = cols[shapeIdx];
        if (routeId && shapeId && !routeShapes[routeId]) {
          routeShapes[routeId] = shapeId;
        }
      }
      shapesLoaded = true;
      console.log(`[GTFS] Mapped ${Object.keys(routeShapes).length} routes to shapes`);
    }

  } catch(e) {
    console.error('[GTFS] Static load failed:', e.message);
  }
}

// ── FETCH REALTIME ──
async function refreshCache() {
  try {
    const buf = await fetchBuffer(ZET_FEED_URL);
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);
    const vehicles = [];

    for (const entity of feed.entity) {
      const vp = entity.vehicle;
      if (!vp || !vp.position) continue;
      const lat = vp.position.latitude;
      const lng = vp.position.longitude;

      if (lat < 45.6 || lat > 46.1 || lng < 15.7 || lng > 16.3) continue;

      // Filter: mora biti blizu poznate stanice (300m)
      let nearStop = null;
      if (stopsLoaded && stops.length > 0) {
        const { stop, dist } = nearestStop(lat, lng);
        if (dist > 300) continue;
        nearStop = stop ? stop.name : null;
      }

      vehicles.push({
        id: entity.id,
        lat, lng,
        bearing: vp.position.bearing || 0,
        speed: Math.round((vp.position.speed || 0) * 3.6),
        routeId: vp.trip && vp.trip.routeId ? vp.trip.routeId : '',
        vehicleLabel: vp.vehicle && vp.vehicle.label ? vp.vehicle.label : entity.id,
        nearStop,
      });
    }

    cache.vehicles = vehicles;
    cache.lastFetch = Date.now();
    console.log(`[ZET] ${vehicles.length} vehicles`);
  } catch(e) {
    console.error('[ZET] Error:', e.message);
  }
}

// ── ROUTES ──
app.get('/', (req, res) => res.json({
  status: 'ok',
  stopsLoaded,
  stopsCount: stops.length,
  shapesLoaded,
  shapesCount: Object.keys(shapes).length,
  routesCount: Object.keys(routeShapes).length,
  vehiclesCached: cache.vehicles ? cache.vehicles.length : 0,
  lastFetch: cache.lastFetch ? new Date(cache.lastFetch).toISOString() : null
}));

app.get('/vehicles', async (req, res) => {
  if (!cache.vehicles || Date.now() - cache.lastFetch > CACHE_TTL) await refreshCache();
  if (!cache.vehicles) return res.status(503).json({ error: 'unavailable', vehicles: [] });
  res.json({
    vehicles: cache.vehicles,
    count: cache.vehicles.length,
    timestamp: new Date(cache.lastFetch).toISOString(),
  });
});

app.get('/route/:routeId', (req, res) => {
  const routeId = req.params.routeId;
  const shapeId = routeShapes[routeId];
  if (!shapeId || !shapes[shapeId]) {
    return res.status(404).json({ error: 'Route not found', routeId });
  }
  res.json({
    routeId,
    shapeId,
    points: shapes[shapeId],
    count: shapes[shapeId].length
  });
});

app.get('/stops', (req, res) => {
  res.json({ count: stops.length, sample: stops.slice(0, 5) });
});

app.get('/status', (req, res) => res.json({
  uptime: Math.round(process.uptime()),
  stopsLoaded, stopsCount: stops.length,
  shapesLoaded, shapesCount: Object.keys(shapes).length,
  cached: cache.vehicles ? cache.vehicles.length : 0,
}));

// ── START ──
app.listen(PORT, async () => {
  console.log(`ZET Proxy v3 on port ${PORT}`);
  await loadGtfsStatic();
  await refreshCache();
  setInterval(refreshCache, CACHE_TTL);
  setInterval(loadGtfsStatic, 24 * 60 * 60 * 1000);
});
