# Pharis + OpenStreetMap - تعليمات التركيب

## المشكلة
التطبيق يعتمد على ملفات JSON محلية فقط (alger.json, oran.json, sba.json) ولا يجلب الصيدليات الجديدة من الإنترنت.

## الحل
إضافة Cloud Functions تستدعي Overpass API (OpenStreetMap) مجاناً.

## الخطوات

### 1. تحديث functions/
استبدل الملفات في مجلد `functions/` بملفات الـ ZIP:
- `functions/index.js` ← يحتوي على الـ Functions الجديدة
- `functions/package.json` ← يحتوي على axios

### 2. تثبيت axios
```bash
cd functions
npm install
```

### 3. نشر الـ Functions
```bash
firebase deploy --only functions
```

### 4. إضافة كود العميل
انسخ `osm-client.js` إلى جذر المشروع (`Pharise/osm-client.js`).

في `index.html` أضف:
```html
<script src="osm-client.js"></script>
```

### 5. استخدام الـ Functions في تطبيقك

```javascript
// جلب صيدليات قريبة
fetchNearbyPharmaciesFromOSM(36.7538, 3.0588, 5000);

// جلب صيدليات مدينة
fetchCityPharmacies('Algiers');
```

## المدن المدعومة
Algiers, Oran, Constantine, Annaba, Blida, Setif, Batna, Bejaia, Tlemcen, Ouargla, Biskra, Tizi Ouzou, Skikda, Djelfa, Mostaganem, Sidi Bel Abbes, Ghardaia, Medea, Tebessa, Tipaza

## ملاحظة
- Overpass API مجاني 100% ولا يحتاج API Key
- البيانات من OpenStreetMap (مجتمعيّة ومحدّثة)
- يغطي كل ولايات الجزائر
