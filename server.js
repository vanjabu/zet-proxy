const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Dozvoli pozive s bilo koje domene (web app na Vercelu)
app.use(cors());

// ── ZET GTFS-RT ENDPOINTI ──
const ZET_VEHICLE_POSITIONS = 'https://www.zet.hr/gtfs-realtime/vehicle-positions.pb';
const ZET_TRIP_UPDATES      = 'https://www.zet.hr/gtfs-realtime/trip-updates.pb';

// Cache — ne bombardiramo ZET server
let cache = {
  vehicles: null,
  tripUpdates: null,
  lastFetch: 0,
};
const CACHE_TTL = 30 * 1000; // 30 sekundi

// ── GTFS-RT PARSER ──
// Ručni parser za Protocol Buffer format (bez external library)
// GTFS-RT VehiclePosition message struktura
function parseGtfsRt(buffer) {
  const vehicles = [];

  try {
    let pos = 0;

    function readVarint() {
      let result = 0, shift = 0;
      while (pos < buffer.length) {
        const byte = buffer[pos++];
        result |= (byte & 0x7F) << shift;
        if (!(byte & 0x80)) break;
        shift += 7;
      }
      return result;
    }

    function readString(len) {
      const str = buffer.slice(pos, pos + len).toString('utf8');
      pos += len;
      return str;
    }

    function skipField(wireType) {
      if (wireType === 0) readVarint();
      else if (wireType === 2) { const len = readVarint(); pos += len; }
      else if (wireType === 5) pos += 4;
      else if (wireType === 1) pos += 8;
    }

    // Čitaj FeedMessage
    while (pos < buffer.length) {
      const tag = readVarint();
      const fieldNum = tag >> 3;
      const wireType = tag & 0x7;

      if (fieldNum === 2 && wireType === 2) {
        // FeedEntity
        const entityLen = readVarint();
        const entityEnd = pos + entityLen;
        let entity = { id: '', vehicle: null };

        while (pos < entityEnd) {
          const etag = readVarint();
          const efn = etag >> 3;
          const ewt = etag & 0x7;

          if (efn === 1 && ewt === 2) {
            // entity id
            const l = readVarint(); entity.id = readString(l);
          } else if (efn === 4 && ewt === 2) {
            // VehiclePosition message
            const vpLen = readVarint();
            const vpEnd = pos + vpLen;
            let vp = { lat: 0, lng: 0, bearing: 0, speed: 0, trip: {}, vehicle: {} };

            while (pos < vpEnd) {
              const vtag = readVarint();
              const vfn = vtag >> 3;
              const vwt = vtag & 0x7;

              if (vfn === 1 && vwt === 2) {
                // TripDescriptor
                const tLen = readVarint();
                const tEnd = pos + tLen;
                while (pos < tEnd) {
                  const ttag = readVarint();
                  const tfn = ttag >> 3; const twt = ttag & 0x7;
                  if (tfn === 1 && twt === 2) { const l = readVarint(); vp.trip.tripId = readString(l); }
                  else if (tfn === 5 && twt === 2) { const l = readVarint(); vp.trip.routeId = readString(l); }
                  else skipField(twt);
                }
              } else if (vfn === 2 && vwt === 2) {
                // VehicleDescriptor
                const dLen = readVarint();
                const dEnd = pos + dLen;
                while (pos < dEnd) {
                  const dtag = readVarint();
                  const dfn = dtag >> 3; const dwt = dtag & 0x7;
                  if (dfn === 1 && dwt === 2) { const l = readVarint(); vp.vehicle.id = readString(l); }
                  else if (dfn === 2 && dwt === 2) { const l = readVarint(); vp.vehicle.label = readString(l); }
                  else skipField(dwt);
                }
              } else if (vfn === 3 && vwt === 2) {
                // Position
                const pLen = readVarint();
                const pEnd = pos + pLen;
                while (pos < pEnd) {
                  const ptag = readVarint();
                  const pfn = ptag >> 3; const pwt = ptag & 0x7;
                  if (pfn === 1 && pwt === 5) {
                    vp.lat = buffer.readFloatLE(pos); pos += 4;
                  } else if (pfn === 2 && pwt === 5) {
                    vp.lng = buffer.readFloatLE(pos); pos += 4;
                  } else if (pfn === 3 && pwt === 5) {
                    vp.bearing = buffer.readFloatBE(pos); pos += 4;
                  } else if (pfn === 4 && pwt === 0) {
                    vp.odometer = readVarint();
                  } else if (pfn === 5 && pwt === 5) {
                    vp.speed = buffer.readFloatBE(pos); pos += 4;
                  } else skipField(pwt);
                }
              } else {
                skipField(vwt);
              }
            }
            entity.vehicle = vp;
          } else {
            skipField(ewt);
          }
        }
        pos = entityEnd;
        if (entity.vehicle && entity.vehicle.lat !== 0) {
          vehicles.push(entity);
        }
      } else {
        skipField(wireType);
      }
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }

  return vehicles;
}

// ── HTTP FETCH helper ──
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 10000 }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// ── REFRESH CACHE ──
async function refreshCache() {
  try {
    console.log('[ZET] Fetching vehicle positions...');
    const buf = await fetchBuffer(ZET_VEHICLE_POSITIONS);
    const parsed = parseGtfsRt(buf);
    cache.vehicles = parsed;
    cache.lastFetch = Date.now();
    console.log(`[ZET] Got ${parsed.length} vehicles`);
  } catch (e) {
    console.error('[ZET] Fetch failed:', e.message);
  }
}

// ── ROUTES ──
// Debug - vidi sirove bytes od ZET feeda
app.get('/debug', async (req, res) => {
  try {
    const buf = await fetchBuffer(ZET_VEHICLE_POSITIONS);
    res.json({
      totalBytes: buf.length,
      first50bytes: buf.slice(0, 50).toString('hex'),
      first10bytes_decimal: Array.from(buf.slice(0, 10)),
    });
  } catch(e) {
    res.json({ error: e.message });
  }
});
```

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ZET Tracker Proxy',
    cached: cache.vehicles?.length || 0,
    lastFetch: cache.lastFetch ? new Date(cache.lastFetch).toISOString() : null
  });
});

// Vehicle positions endpoint
app.get('/vehicles', async (req, res) => {
  // Osvježi cache ako je star
  if (!cache.vehicles || Date.now() - cache.lastFetch > CACHE_TTL) {
    await refreshCache();
  }

  if (!cache.vehicles) {
    return res.status(503).json({ error: 'ZET data unavailable', vehicles: [] });
  }

  // Formatiraj za frontend
  const vehicles = cache.vehicles.map(e => ({
    id: e.id,
    lat: e.vehicle.lat,
    lng: e.vehicle.lng,
    bearing: e.vehicle.bearing || 0,
    speed: Math.round((e.vehicle.speed || 0) * 3.6), // m/s → km/h
    routeId: e.vehicle.trip?.routeId || '',
    tripId: e.vehicle.trip?.tripId || '',
    vehicleLabel: e.vehicle.vehicle?.label || e.id,
  }));

  res.json({
    vehicles,
    count: vehicles.length,
    timestamp: new Date(cache.lastFetch).toISOString(),
    nextRefresh: Math.max(0, Math.round((CACHE_TTL - (Date.now() - cache.lastFetch)) / 1000))
  });
});

// Status
app.get('/status', (req, res) => {
  res.json({
    uptime: Math.round(process.uptime()),
    cached: cache.vehicles?.length || 0,
    cacheAge: cache.lastFetch ? Math.round((Date.now() - cache.lastFetch) / 1000) + 's' : 'never',
  });
});

// ── START ──
app.listen(PORT, async () => {
  console.log(`ZET Proxy running on port ${PORT}`);
  await refreshCache(); // Inicijalni fetch
  setInterval(refreshCache, CACHE_TTL); // Auto-refresh
});
