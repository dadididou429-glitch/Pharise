// ==========================================
// Pharis - OpenStreetMap Integration (Client)
// ==========================================
// أضف هذا الملف في جذر المشروع واستدعِه في index.html:
// <script src="osm-client.js"></script>

/**
 * جلب الصيدليات القريبة من OpenStreetMap
 * @param {number} userLat - خط العرض
 * @param {number} userLon - خط الطول
 * @param {number} radius - نصف القطر بالمتر (افتراضي: 5000)
 */
async function fetchNearbyPharmaciesFromOSM(userLat, userLon, radius = 5000) {
  const getNearby = firebase.functions().httpsCallable('getNearbyPharmaciesOSM');

  try {
    showLoading && showLoading('جاري البحث عن الصيدليات القريبة...');

    const result = await getNearby({ lat: userLat, lon: userLon, radius: radius });
    const pharmacies = result.data.pharmacies;

    console.log(`[OSM] Found ${pharmacies.length} pharmacies`);

    // دمج مع البيانات المحلية إذا أردت
    // const localPharmacies = await fetchLocalPharmacies(userLat, userLon);
    // const merged = mergePharmacies(localPharmacies, pharmacies);

    displayPharmacies(pharmacies, userLat, userLon);

    hideLoading && hideLoading();
    return pharmacies;

  } catch (error) {
    console.error('[OSM] Error:', error);
    hideLoading && hideLoading();
    // Fallback: استخدم البيانات المحلية فقط
    return fetchLocalPharmacies ? fetchLocalPharmacies(userLat, userLon) : [];
  }
}

/**
 * جلب صيدليات مدينة معينة
 * @param {string} cityName - اسم المدينة بالإنجليزية
 */
async function fetchCityPharmacies(cityName) {
  const getByCity = firebase.functions().httpsCallable('getPharmaciesByCity');

  try {
    showLoading && showLoading(`جاري تحميل صيدليات ${cityName}...`);

    const result = await getByCity({ city: cityName });
    const pharmacies = result.data.pharmacies;

    console.log(`[OSM] Loaded ${pharmacies.length} pharmacies in ${cityName}`);
    displayPharmacies(pharmacies);

    hideLoading && hideLoading();
    return pharmacies;

  } catch (error) {
    console.error('[OSM] City Error:', error);
    hideLoading && hideLoading();
    return [];
  }
}

/**
 * عرض الصيدليات على الخريطة أو القائمة
 * عدّل هذه الدالة حسب تصميم تطبيقك
 */
function displayPharmacies(pharmacies, userLat, userLon) {
  // استخدم نفس دالة العرض الموجودة في تطبيقك
  // مثال:
  if (typeof renderPharmacyList === 'function') {
    renderPharmacyList(pharmacies);
  } else {
    console.log('Pharmacies:', pharmacies);
  }

  // إذا عندك خريطة:
  if (typeof addMarkersToMap === 'function') {
    addMarkersToMap(pharmacies);
  }
}

/**
 * تشغيل تلقائي عند تحميل الصفحة
 * يجب أن يكون Firebase initialized
 */
document.addEventListener('DOMContentLoaded', () => {
  // فك التعليق إذا أردت تشغيل تلقائي
  // autoDetectAndFetchOSM();
});

function autoDetectAndFetchOSM() {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      fetchNearbyPharmaciesFromOSM(lat, lon, 5000);
    },
    (error) => {
      console.warn('Geolocation denied:', error);
    }
  );
}

// تصدير للاستخدام العام
window.fetchNearbyPharmaciesFromOSM = fetchNearbyPharmaciesFromOSM;
window.fetchCityPharmacies = fetchCityPharmacies;
window.autoDetectAndFetchOSM = autoDetectAndFetchOSM;
