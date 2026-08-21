# Pharis - OpenStreetMap (Full Package)

## ملفات ZIP

| الملف | الوصف |
|-------|-------|
| `index.html` | صفحة كاملة جاهزة — خريطة + قائمة صيدليات + أزرار |
| `osm-fetcher.js` | جلب البيانات من OpenStreetMap |

## لا يحتاج
- ❌ Firestore
- ❌ Firebase Functions
- ❌ Backend سيرفر
- ❌ API Key

## التركيب

### الخيار 1: رفع على GitHub Pages (مباشر)
1. ارفع الملفين على GitHub repo
2. فعل GitHub Pages من Settings
3. افتح الرابط — يشتغل فوراً

### الخيار 2: دمج مع مشروعك الحالي
1. انسخ `osm-fetcher.js` إلى مشروعك
2. استدعِه في `index.html`:
   ```html
   <script src="osm-fetcher.js"></script>
   ```
3. استخدم الدوال:
   ```javascript
   const pharmacies = await fetchNearbyPharmaciesOSM(lat, lon, 5000);
   ```

## الميزات
- 🗺️ خريطة تفاعلية (Leaflet)
- 📍 تحديد موقع تلقائي
- 🏙️ بحث بـ 20 مدينة جزائرية
- 📏 حساب المسافة تلقائياً
- 📞 زر اتصال مباشر
- 🗺️ زر اتجاهات Google Maps
