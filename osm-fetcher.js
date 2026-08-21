// ==========================================
// Pharis - OpenStreetMap Fetcher (Standalone)
// No Firestore, No Firebase Functions, No Backend
// Direct browser call to Overpass API (CORS enabled)
// ==========================================

const OSM_API_URL = 'https://overpass-api.de/api/interpreter';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

async function fetchNearbyPharmaciesOSM(lat, lon, radius = 5000) {
  const query = `[out:json][timeout:30];
(
  node["amenity"="pharmacy"](around:${radius},${lat},${lon});
  way["amenity"="pharmacy"](around:${radius},${lat},${lon});
  relation["amenity"="pharmacy"](around:${radius},${lat},${lon});
);
out center;
>;
out skel qt;`;

  try {
    console.log(`[OSM] Fetching pharmacies within ${radius}m...`);
    const response = await fetch(OSM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const pharmacies = (data.elements || [])
      .map(el => {
        const tags = el.tags || {};
        const pLat = el.lat || el.center?.lat;
        const pLon = el.lon || el.center?.lon;
        if (!pLat || !pLon) return null;
        return {
          id: el.id.toString(),
          name: tags.name || tags['name:ar'] || tags['name:fr'] || 'صيدلية',
          address: tags['addr:street'] || tags['addr:full'] || '',
          city: tags['addr:city'] || '',
          wilaya: tags['addr:state'] || '',
          lat: pLat,
          lon: pLon,
          distanceKm: Math.round(haversine(lat, lon, pLat, pLon) * 100) / 100,
          phone: tags.phone || tags['contact:phone'] || '',
          openingHours: tags.opening_hours || '',
          isOpen24h: tags.opening_hours === '24/7',
          source: 'OpenStreetMap'
        };
      })
      .filter(p => p !== null);

    pharmacies.sort((a, b) => a.distanceKm - b.distanceKm);
    console.log(`[OSM] Found ${pharmacies.length} pharmacies`);
    return pharmacies;
  } catch (error) {
    console.error('[OSM] Error:', error.message);
    return [];
  }
}

async function fetchCityPharmaciesOSM(city) {
  const bboxes = {
    'Algiers': [36.65, 2.95, 36.85, 3.20],
    'Oran': [35.60, -0.75, 35.80, -0.55],
    'Constantine': [36.30, 6.55, 36.45, 6.70],
    'Annaba': [36.85, 7.70, 36.95, 7.85],
    'Blida': [36.40, 2.75, 36.55, 2.95],
    'Setif': [36.15, 5.35, 36.25, 5.50],
    'Batna': [35.50, 6.10, 35.65, 6.25],
    'Bejaia': [36.70, 5.00, 36.80, 5.15],
    'Tlemcen': [34.80, -1.40, 34.95, -1.25],
    'Ouargla': [31.85, 5.25, 32.05, 5.45],
    'Biskra': [34.80, 5.70, 34.90, 5.80],
    'Tizi Ouzou': [36.65, 4.00, 36.75, 4.10],
    'Skikda': [36.80, 6.85, 36.90, 7.00],
    'Djelfa': [34.60, 3.20, 34.75, 3.35],
    'Mostaganem': [35.85, 0.00, 36.00, 0.15],
    'Sidi Bel Abbes': [35.15, -0.70, 35.25, -0.55],
    'Ghardaia': [32.40, 3.70, 32.55, 3.85],
    'Medea': [36.20, 2.70, 36.30, 2.85],
    'Tebessa': [35.35, 8.05, 35.45, 8.15],
    'Tipaza': [36.55, 2.40, 36.65, 2.50],
  };

  const bbox = bboxes[city];
  if (!bbox) { console.error(`[OSM] City "${city}" not supported`); return []; }

  const query = `[out:json][timeout:60];
(
  node["amenity"="pharmacy"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["amenity"="pharmacy"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
);
out center;`;

  try {
    const response = await fetch(OSM_API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: query
    });
    const data = await response.json();
    const pharmacies = (data.elements || [])
      .map(el => {
        const tags = el.tags || {};
        return {
          id: el.id.toString(),
          name: tags.name || tags['name:ar'] || tags['name:fr'] || 'صيدلية',
          address: tags['addr:street'] || '',
          city: tags['addr:city'] || city,
          wilaya: tags['addr:state'] || '',
          lat: el.lat || el.center?.lat,
          lon: el.lon || el.center?.lon,
          phone: tags.phone || tags['contact:phone'] || '',
          openingHours: tags.opening_hours || '',
          source: 'OpenStreetMap'
        };
      })
      .filter(p => p.lat && p.lon);
    console.log(`[OSM] Found ${pharmacies.length} pharmacies in ${city}`);
    return pharmacies;
  } catch (error) {
    console.error('[OSM] City Error:', error.message);
    return [];
  }
}

function mergeWithLocalPharmacies(osmPharmacies, localPharmacies) {
  const merged = [...localPharmacies];
  const existingCoords = new Set(localPharmacies.map(p => `${p.lat?.toFixed(4)},${p.lon?.toFixed(4)}`));
  for (const p of osmPharmacies) {
    const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
    if (!existingCoords.has(key)) { merged.push(p); existingCoords.add(key); }
  }
  return merged;
}

if (typeof window !== 'undefined') {
  window.fetchNearbyPharmaciesOSM = fetchNearbyPharmaciesOSM;
  window.fetchCityPharmaciesOSM = fetchCityPharmaciesOSM;
  window.mergeWithLocalPharmacies = mergeWithLocalPharmacies;
}
