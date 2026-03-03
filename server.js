const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());

const ZET_FEED_URL = 'https://zet.hr/gtfs-rt-protobuf';
let cache = { vehicles: null, lastFetch: 0 };
const CACHE_TTL = 30 * 1000;

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function refreshCache() {
  try {
    const buf = await fetchBuffer(ZET_FEED_URL);
    console.log('[ZET] Got ' + buf.length + ' bytes');
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);
    const vehicles = [];
    for (const entity of feed.entity) {
      const vp = entity.vehicle;
      if (!vp || !vp.position) continue;
      const lat = vp.position.latitude;
      const lng = vp.position.longitude;
      if (lat < 45.6 || lat > 46.1 || lng < 15.7 || lng > 16.3) continue;
      vehicles.push({
        id: entity.id, lat, lng,
        bearing: vp.position.bearing || 0,
        speed: Math.round((vp.position.speed || 0) * 3.6),
        routeId: vp.trip && vp.trip.routeId ? vp.trip.routeId : '',
        vehicleLabel: vp.vehicle && vp.vehicle.label ? vp.vehicle.label : entity.id,
      });
    }
    cache.vehicles = vehicles;
    cache.lastFetch = Date.now();
    console.log('[ZET] Parsed ' + vehicles.length + ' vehicles');
  } catch (e) {
    console.error('[ZET] Error:', e.message);
  }
}

app.get('/', (req, res) => res.json({ status: 'ok', cached: cache.vehicles ? cache.vehicles.length : 0 }));

app.get('/vehicles', async (req, res) => {
  if (!cache.vehicles || Date.now() - cache.lastFetch > CACHE_TTL) await refreshCache();
  if (!cache.vehicles) return res.status(503).json({ error: 'unavailable', vehicles: [] });
  res.json({ vehicles: cache.vehicles, count: cache.vehicles.length, timestamp: new Date(cache.lastFetch).toISOString() });
});

app.listen(PORT, async () => {
  console.log('ZET Proxy on port ' + PORT);
  await refreshCache();
  setInterval(refreshCache, CACHE_TTL);
});
