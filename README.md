# إعداد ونشر Cloud Function — recalcPharmacyRating

## 1. المتطلبات
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- مشروع Firebase على **خطة Blaze** (Cloud Functions تتطلب Blaze حتى لو الاستخدام ضمن الحد المجاني)

## 2. التثبيت لأول مرة (لو ما عندك مجلد functions بعد)
```bash
firebase login
firebase init functions
# اختر: Use an existing project → maftouha-ap
# اختر: JavaScript
# لا تكتب فوق index.js إذا أنشأت الملف يدويًا مسبقًا
```
انسخ `index.js` و`package.json` المرفقين إلى مجلد `functions/` في مشروعك.

## 3. التثبيت والنشر
```bash
cd functions
npm install
firebase deploy --only functions:recalcPharmacyRating
```

## 4. تحديث Firestore Rules
تأكد أن قاعدة `ratings/{docId}` (المستند الأب) هي:
```
allow write: if false;
```
هذا يمنع أي كتابة مباشرة من العميل على sum/count، ويترك الحساب للـ Function فقط.

## 5. تحديث كود الواجهة (index.html)
عند إرسال تقييم جديد، الكود الحالي غالبًا يحاول يكتب على مستند `ratings/{pharmacyId}`
مباشرة (sum/count). يلزم تعديله ليكتب **فقط** على subcollection:

```js
// بدل تحديث sum/count يدويًا، فقط أضف review جديد:
await db.collection("ratings").doc(pharmacyId)
  .collection("reviews").add({
    stars: selectedStars,
    comment: sanitize(reviewText, 300) || "",
    uid: auth.currentUser?.uid || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
// الـ Function تتكفل بتحديث sum/count/average تلقائيًا خلال ثوانٍ
```

لعرض التقييم في الواجهة، اقرأ من `ratings/{pharmacyId}` مباشرة (sum/count/average)
— هذي القراءة مفتوحة للجميع (`allow read: if true`) فما فيه تغيير مطلوب هناك.

## 6. ملاحظة حول Anonymous Auth
بما إن قواعد `reviews` تتطلب `request.auth != null` و`uid == request.auth.uid`،
تأكد إن `auth.signInAnonymously()` يتم استدعاؤه عند تحميل التطبيق قبل أي محاولة
لإرسال تقييم أو بلاغ، وإلا راح تفشل الكتابة بصمت.

```js
firebase.auth().onAuthStateChanged(user => {
  if (!user) firebase.auth().signInAnonymously();
});
```

## 7. اختبار محلي (اختياري لكن يُنصح به)
```bash
firebase emulators:start --only functions,firestore
```
جرّب تضيف review تجريبي في الـ Firestore Emulator UI وتأكد إن مستند
`ratings/{pharmacyId}` يتحدّث تلقائيًا.
