# أكواد التفعيل — Pharis

## كيف يعمل النظام؟

1. المشترك يدفع (CCP أو PayPal)
2. أنت ترسل له كوداً من Firebase (أو تجهّز أكواداً مسبقاً)
3. يدخل الكود عند «أضف صيدليتك» → الشارة المميزة تُفعَّل فوراً

## إنشاء كود في Firebase Console

1. افتح مشروع Firebase → Firestore
2. مجموعة (Collection): `activation_codes`
3. أضف مستنداً (Document ID = الكود نفسه)، مثال:
   - Document ID: `PHARIS-A1B2`
   - الحقول:
     - `used` (boolean) = `false`
     - `plan` (string) = `monthly` أو `yearly`
     - `createdAt` (timestamp) = الآن

عند الاستخدام الناجح يُحدَّث تلقائياً:
- `used: true`
- `usedAt`, `pharmacyName`, `wilaya`

## أمثلة أكواد جاهزة للإنشاء

```
PHARIS-A1B2
PHARIS-C3D4
PHARIS-E5F6
PHARIS-G7H8
PHARIS-J9K0
```

أنشئ 10–20 كوداً مسبقاً، وعندما يدفع مشترك أرسل له كوداً غير مستخدم.

## تفعيل يدوي بدون كود

Firestore → `pharmacy_features` → Document ID = معرّف الصيدلية:

```
featured: true
verified: true
```

## الدفع

- CCP: 0025148966 / 05 — Mohammed Naar
- PayPal: hamidounaar22@gmail.com
- واتساب: 0559 85 61 69
