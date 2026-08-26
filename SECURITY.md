# Pharis — تأمين التطبيق

## الملفات
1. firestore.rules → انشرها في Firebase Console → Firestore → Rules → Publish
2. index.html → ارفعها إلى GitHub (مستودع Pharise)

## ماذا تغيّر في الكود؟
- إيقاف زيادة عدّاد المستخدمين من المتصفح (stats محمية)
- طلبات الدواء بحقول متوافقة + تسجيل مجهول للقراءة الآمنة
- الشارة المميزة لا تُكتب من العميل إلا للأدمن؛ غير الأدمن يستهلك الكود فقط

## Firebase Console (مهم)
1. Authentication → فعّل Anonymous + Email/Password
2. انشر firestore.rules
3. أكواد التفعيل: أنشئها يدوياً (مستندات في activation_codes)
4. بعد دفع صيدلية: أضف يدوياً في pharmacy_features إن لزم
5. لاحقاً: App Check

## عدّاد المستخدمين
عدّل stats/users يدوياً أو عبر Cloud Function لاحقاً.
