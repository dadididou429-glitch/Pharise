const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

// ==========================================
// Existing Functions (keep your current ones)
// ==========================================

// ... your existing recalcPharmacyRating and other functions here ...

// ==========================================
// NEW: OpenStreetMap Pharmacy Fetcher
// ==========================================

const CITY_BBOX = {
  'Algiers': { minLat: 36.65, maxLat: 36.85, minLon: 2.95, maxLon: 3.20 },
  'Oran':    { minLat: 35.60, maxLat: 35.80, minLon: -0.75, maxLon: -0.55 },
  'Constantine': { minLat: 36.30, maxLat: 36.45, minLon: 6.55, maxLon: 6.70 },
  'Annaba':  { minLat: 36.85, maxLat: 36.95, minLon: 7.70, maxLon: 7.85 },
  'Blida':   { minLat: 36.40, maxLat: 36.55, minLon: 2.75, maxLon: 2.95 },
  'Setif':   { minLat: 36.15, maxLat: 36.25, minLon: 5.35, maxLon: 5.50 },
  'Batna':   { minLat: 35.50, maxLat: 35.65, minLon: 6.10, maxLon: 6.25 },
  'Bejaia':  { minLat: 36.70, maxLat: 36.80, minLon: 5.00, maxLon: 5.15 },
  'Tlemcen': { minLat: 34.80, maxLat: 34.95, minLon: -1.40, maxLon: -1.25 },
  'Ouargla': { minLat: 31.85, maxLat: 32.05, minLon: 5.25, maxLon: 5.45 },
  'Biskra':  { minLat: 34.80, maxLat: 34.90, minLon: 5.70, maxLon: 5.80 },
  'Tizi Ouzou': { minLat: 36.65, maxLat: 36.75, minLon: 4.00, maxLon: 4.10 },
  'Skikda':  { minLat: 36.80, maxLat: 36.90, minLon: 6.85, maxLon: 7.00 },
  'Djelfa':  { minLat: 34.60, maxLat: 34.75, minLon: 3.20, maxLon: 3.35 },
  'Mostaganem': { minLat: 35.85, maxLat: 36.00, minLon: 0.00, maxLon: 0.15 },
  'Sidi Bel Abbes': { minLat: 35.15, maxLat: 35.25, minLon: -0.70, maxLon: -0.55 },
  'Ghardaia': { minLat: 32.40, maxLat: 32.55, minLon: 3.70, maxLon: 3.85 },
  'Medea':   { minLat: 36.20, maxLat: 36.30, minLon: 2.70, maxLon: 2.85 },
  'Tebessa': { minLat: 35.35, maxLat: 35.45, minLon: 8.05, maxLon: 8.15 },
  'Tipaza':  { minLat: 36.55, maxLat: 36.65, minLon: 2.40, maxLon: 2.50 },
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * getNearbyPharmaciesOSM
 * تجلب الصيدليات القريبة من Overpass API (OpenStreetMap) - مجاني
 */
exports.getNearbyPharmaciesOSM = functions.https.onCall(async (data, context) => {
  const { lat, lon, radius = 5000 } = data;

  if (!lat || !lon) {
    throw new functions.https.HttpsError('invalid-argument', 'lat and lon are required');
  }

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
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      {
        headers: { 'Content-Type': 'text/plain', 'User-Agent': 'PharisApp/1.0' },
        timeout: 30000
      }
    );

    const pharmacies = (response.data.elements || []).map(el => {
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
    }).filter(p => p !== null);

    pharmacies.sort((a, b) => a.distanceKm - b.distanceKm);

    return { success: true, total: pharmacies.length, radius, pharmacies };

  } catch (error) {
    console.error('Overpass API Error:', error.message);
    throw new functions.https.HttpsError('internal', 'Failed to fetch from OpenStreetMap');
  }
});

/**
 * getPharmaciesByCity
 * تجلب كل الصيدليات في مدينة معينة
 */
exports.getPharmaciesByCity = functions.https.onCall(async (data, context) => {
  const { city } = data;

  if (!city || !CITY_BBOX[city]) {
    throw new functions.https.HttpsError('invalid-argument', 
      `City not supported. Available: ${Object.keys(CITY_BBOX).join(', ')}`);
  }

  const bbox = CITY_BBOX[city];
  const query = `[out:json][timeout:60];
(
  node["amenity"="pharmacy"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
  way["amenity"="pharmacy"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
);
out center;`;

  try {
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      {
        headers: { 'Content-Type': 'text/plain', 'User-Agent': 'PharisApp/1.0' },
        timeout: 60000
      }
    );

    const pharmacies = (response.data.elements || []).map(el => {
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
    }).filter(p => p.lat && p.lon);

    return { success: true, city, total: pharmacies.length, pharmacies };

  } catch (error) {
    console.error('Overpass Error:', error.message);
    throw new functions.https.HttpsError('internal', 'Failed to fetch city pharmacies');
  }
});
