# تعليمات دمج شاشة الافتتاحية 3D في تطبيق Pharis

## المشكلة
الملف السابق كان تطبيقًا مستقلًا يستبدل تطبيقك بالكامل. هذا الدليل يشرح كيف تُضيف الافتتاحية **كطبقة فوق** تطبيقك الحالي دون كسر أي شيء.

---

## الخطوة 1: أضف ملف CSS

انسخ محتوى `splash-screen.css` إلى نهاية ملف CSS الحالي في مشروعك (أو اربطه كملف منفصل):

```html
<link rel="stylesheet" href="splash-screen.css">
```

> **مهم:** لا تستبدل CSS الحالي. أضف فقط في النهاية.

---

## الخطوة 2: أضف ملف JavaScript

انسخ محتوى `splash-screen.js` إلى بداية ملف JS الحالي (أو اربطه **قبل** ملف JS الرئيسي):

```html
<script src="splash-screen.js"></script>
<script src="your-main-app.js"></script>
```

> **مهم:** يجب أن يُحمّل `splash-screen.js` **قبل** أي كود يعتمد على DOM.

---

## الخطوة 3: أضف HTML الافتتاحية

انسخ هذا الكود **مباشرة بعد** فتح `<body>` في `index.html`:

```html
<body>
  <!-- ===== SPLASH SCREEN — أضف هذا ===== -->
  <div class="pharis-splash-overlay" id="pharis-splash">
    <div class="pharis-capsule-glow"></div>

    <div class="pharis-capsule-wrap">
      <div class="pharis-capsule-3d">
        <svg class="pharis-capsule-svg" viewBox="0 0 140 220" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#f8f8f8"/>
              <stop offset="50%" style="stop-color:#ffffff"/>
              <stop offset="100%" style="stop-color:#e8e8e8"/>
            </linearGradient>
            <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#dc2626"/>
              <stop offset="50%" style="stop-color:#ef4444"/>
              <stop offset="100%" style="stop-color:#b91c1c"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M20 70 Q20 20 70 20 Q120 20 120 70 L120 110 L20 110 Z" fill="url(#capGrad)" stroke="#ddd" stroke-width="1"/>
          <path d="M20 110 L120 110 L120 150 Q120 200 70 200 Q20 200 20 150 Z" fill="url(#redGrad)"/>
          <g transform="translate(70, 155)" filter="url(#glow)">
            <rect x="-12" y="-4" width="24" height="8" rx="2" fill="#fff"/>
            <rect x="-4" y="-12" width="8" height="24" rx="2" fill="#fff"/>
          </g>
          <g transform="translate(70, 65)" filter="url(#glow)">
            <path d="M0 -18 C-10 -18 -16 -10 -16 0 C-16 12 0 26 0 26 C0 26 16 12 16 0 C16 -10 10 -18 0 -18 Z" fill="#22c55e"/>
            <circle cx="0" cy="-2" r="6" fill="#fff"/>
          </g>
          <ellipse cx="50" cy="65" rx="15" ry="25" fill="rgba(255,255,255,0.3)" transform="rotate(-15 50 65)"/>
          <ellipse cx="50" cy="155" rx="12" ry="20" fill="rgba(255,255,255,0.15)" transform="rotate(-15 50 155)"/>
        </svg>
      </div>
    </div>

    <div class="pharis-splash-name">
      <span class="pharis-letter">P</span>
      <span class="pharis-letter">h</span>
      <span class="pharis-letter">a</span>
      <span class="pharis-letter">r</span>
      <span class="pharis-letter">i</span>
      <span class="pharis-letter">s</span>
    </div>

    <div class="pharis-splash-subtitle">Find Your Pharmacy</div>

    <div class="pharis-loading-bar">
      <div class="pharis-loading-bar-fill"></div>
    </div>
  </div>
  <!-- ===== نهاية SPLASH SCREEN ===== -->

  <!-- ===== باقي تطبيقك الحالي يبقى كما هو ===== -->
  <div id="app">... تطبيقك هنا ...</div>
```

> **مهم:** لا تمسح أي شيء من تطبيقك. فقط ألصق الكود فوقه داخل `<body>`.

---

## الخطوة 4: مؤشر تحديد الموقع (اختياري)

إذا أردت مؤشر تحديد الموقع السريع، أضف هذا أيضًا داخل `<body>`:

```html
<div class="pharis-geo-status" id="pharis-geo-status">
  <div class="pharis-geo-spinner"></div>
  <span id="pharis-geo-text">Detecting location...</span>
</div>
```

ثم استخدمه في كودك:

```javascript
pharisFastGeo(
  (pos) => {
    console.log('Found:', pos.coords.latitude, pos.coords.longitude);
    // اعرض الصيدليات القريبة
  },
  (err) => {
    console.error('Failed:', err);
    // اعرض رسالة خطأ أو خيار البحث اليدوي
  },
  4000 // timeout 4 ثواني
);
```

---

## ملخص الملفات

| الملف | الوظيفة |
|-------|---------|
| `splash-screen.css` | أنماط الافتتاحية فقط |
| `splash-screen.js` | منطق الافتتاحية + تحديد الموقع السريع |
| `INTEGRATION.md` | هذا الدليل |

## ما يحدث

1. الصفحة تُحمّل → الافتتاحية تظهر فوق كل شيء (`z-index: 999999`)
2. الكبسولة تدور 3D + الحروف تتجمّع + شريط التحمّل
3. بعد 3.8 ثواني → الافتتاحية تختفي بتأثير سلس
4. تطبيقك الحالي يظهر تحتها مباشرة
5. لا يُعاد تحميل الصفحة ولا يُفقد أي حالة

## إذا واجهت مشاكل

- تأكد أن `splash-screen.js` يُحمّل **قبل** كود تطبيقك
- تأكد أن كل أسماء الكلاسات (`pharis-...`) لا تتعارض مع أسماء موجودة
- إذا كان تطبيقك يستخدم `display: none` على `<body>` أو `#app`، قد تحتاج تعديل
