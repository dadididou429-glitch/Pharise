# حزمة نشر Pharis — Firestore Rules + Cloud Functions

## محتوى الحزمة
```
firestore.rules          ← القواعد المعدّلة (تحل ثغرات pharmacy_features/activation_codes/ratings/...)
firestore.indexes.json   ← ملف فهارس فارغ (مطلوب شكليًا من firebase.json)
firebase.json            ← يربط الملفين أعلاه + مجلد functions
functions/
  ├── index.js            ← Cloud Function: recalcPharmacyRating
  ├── package.json        ← تبعيات الـ function
  └── README.md            ← تفاصيل إضافية عن الـ function نفسها
```

## طريقة الدمج مع مشروعك الحالي (dadididou429-glitch/Pharise)

1. فكّ ضغط هذا الملف داخل مجلد المشروع محليًا (نفس المكان اللي فيه index.html):
   ```bash
   cd Pharise          # مجلد المشروع اللي فيه index.html
   unzip pharis-deploy.zip -d .
   ```
   بهذا تصير عندك هذي الملفات الجديدة بجانب ملفاتك الحالية (لن تُحذف أو تُستبدل أي من ملفاتك: index.html, manifest.json... إلخ تبقى كما هي).

2. سجّل دخول وفعّل Firebase CLI (أول مرة فقط):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. اربط المجلد بمشروعك الموجود (maftouha-ap):
   ```bash
   firebase use --add
   # اختر: maftouha-ap
   ```

4. ثبّت تبعيات الـ function:
   ```bash
   cd functions
   npm install
   cd ..
   ```

5. انشر القواعد والـ function معًا:
   ```bash
   firebase deploy --only firestore:rules,functions
   ```

## بعد النشر
- عدّل `index.html` بحيث إرسال تقييم جديد يكتب فقط على
  `ratings/{pharmacyId}/reviews/{reviewId}` (بدون لمس sum/count يدويًا) —
  التفاصيل والكود الجاهز في `functions/README.md`.
- فعّل Anonymous Auth من Firebase Console → Authentication → Sign-in method،
  وتأكد إن `auth.signInAnonymously()` يشتغل عند تحميل الصفحة (مطلوب لأن
  قواعد complaints/reviews الجديدة تتطلب `request.auth != null`).
- تأكد إن مشروعك على خطة Blaze (مطلوبة لأي Cloud Function حتى ضمن الحد المجاني).

## ملاحظة
لم يتم تضمين index.html أو أي ملف من ملفاتك الأصلية في هذي الحزمة —
هذي فقط الإضافات الأمنية (rules) والبنية التحتية الجديدة (functions).
