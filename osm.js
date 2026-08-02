const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

function parseOpeningHours(oh) {
  if (!oh) return { open: 8, close: 21, onDuty: false };
  const s = String(oh).toLowerCase().replace(/\s/g, "");
  if (s.includes("24/7") || s.includes("24hours")) return { open: 0, close: 24, onDuty: true };
  const m = String(oh).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (m) {
    const open = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
    let close = parseInt(m[3], 10) + parseInt(m[4], 10) / 60;
    if (close <= open) close += 24;
    return { open, close, onDuty: false };
  }
  return { open: 8, close: 21, onDuty: false };
}

function mapElement(el, defaultCity = "") {
  const t = el.tags || {};
  const lat = el.lat || el.center?.lat;
  const lng = el.lon || el.center?.lon;
  if (!lat || !lng) return null;
  const rawName = t["name:ar"] || t["name:fr"] || t.name || t.brand || "";
  const name = rawName
    ? /صيدلية|pharmacie|pharmacy/i.test(rawName) ? rawName : `صيدلية ${rawName}`
    : (defaultCity ? `صيدلية ${defaultCity}` : "صيدلية");
  const hours = parseOpeningHours(t.opening_hours);
  const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean).join(", ");
  return {
    id: `osm_${el.type || "n"}_${el.id}`,
    name,
    area: t["addr:suburb"] || t["addr:city"] || defaultCity,
    address: address || defaultCity,
    phone: t.phone || t["contact:phone"] || null,
    lat, lng,
    hours: { open: hours.open, close: hours.close },
    onDuty: hours.onDuty,
    wilaya: defaultCity || "OSM",
    commune: t["addr:city"] || defaultCity,
    verified: true,
    fromOSM: true,
  };
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((p) => {
    if (!p) return false;
    const key = `${p.lat.toFixed(4)}_${p.lng.toFixed(4)}_${(p.name || "").slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem("pharis_osm_" + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > 3 * 60 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try { localStorage.setItem("pharis_osm_" + key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

async function overpassFetch(query) {
  let lastErr;
  for (const endpoint of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 22000);
      const res = await fetch(endpoint, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data.elements) throw new Error("Invalid response");
      return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Overpass failed");
}

export async function fetchOSMPharmacies(lat, lng, radius = 15000) {
  const cacheKey = `near_${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}`;
  const cached = cacheGet(cacheKey);
  if (cached?.length) return cached;
  const query = `[out:json][timeout:20];
(
  node["amenity"="pharmacy"](around:${radius},${lat},${lng});
  way["amenity"="pharmacy"](around:${radius},${lat},${lng});
  node["healthcare"="pharmacy"](around:${radius},${lat},${lng});
  way["healthcare"="pharmacy"](around:${radius},${lat},${lng});
);
out center tags;`;
  const data = await overpassFetch(query);
  const result = dedupe((data.elements || []).map((el) => mapElement(el)));
  if (result.length) cacheSet(cacheKey, result);
  return result;
}

export async function fetchOSMByCity(cityName, lat, lng) {
  const cacheKey = "city_" + String(cityName).toLowerCase().replace(/\s+/g, "_").slice(0, 50);
  const cached = cacheGet(cacheKey);
  if (cached?.length) return cached;
  let cityLat = lat, cityLng = lng, displayCity = cityName;
  if (!cityLat || !cityLng) {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      { headers: { "Accept-Language": "ar,en,fr" } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("City not found");
    cityLat = parseFloat(geoData[0].lat);
    cityLng = parseFloat(geoData[0].lon);
    displayCity = geoData[0].display_name.split(",")[0];
  }
  let result = [];
  for (const radius of [12000, 20000, 30000]) {
    result = await fetchOSMPharmacies(cityLat, cityLng, radius);
    if (result.length >= 5) break;
  }
  const tagged = result.map((p) => ({
    ...p, wilaya: displayCity, commune: p.commune || displayCity, area: p.area || displayCity,
  }));
  if (tagged.length) cacheSet(cacheKey, tagged);
  return tagged;
}
