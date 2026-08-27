# تحديث Pharis

## التعديلات المطلوبة على index.html

### 1. CSP (بعد charset)
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://www.gstatic.com https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.openstreetmap.org; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://nominatim.openstreetmap.org https://overpass-api.de https://overpass.kumi.systems https://overpass.nchc.org.tw; frame-src 'self'; manifest-src 'self';" />
```

### 2. Referrer Policy
```html
<meta name="referrer" content="strict-origin-when-cross-origin" />
```

### 3. تقليل فترة فحص SW
ابحث عن: `setInterval(function () { reg.update(); }, 5 * 1000);`
استبدله بـ: `setInterval(function () { reg.update(); }, 5 * 60 * 1000);`

### 4. وضع الطوارئ التلقائي
```javascript
const [emergencyMode, setEmergencyMode] = useState(() => {
  const h = new Date().getHours();
  const d = new Date().getDay();
  const isWeekend = d === 5 || d === 6;
  return h >= 20 || h < 8 || (isWeekend && h >= 18);
});
```

### 5. أضف security-patch.js قبل `</body>`
```html
<script src="./security-patch.js"></script>
```

## إعدادات Firebase (مهمة)
1. Firebase Console > Project Settings > API Keys > Restrict key
2. HTTP referrers: `https://dadididou429-glitch.github.io/*`
3. فعّل App Check (reCAPTCHA v3)
