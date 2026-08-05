# تفعيل الدفع التلقائي + كود فوري (PayPal)

## لماذا PayPal فقط للتفعيل الفوري؟
- تحويل CCP/البنك **لا يُرسل إشعاراً تلقائياً** لموقعك → لا يمكن إصدار كود بدون تدخلك.
- PayPal بعد الدفع الناجح يُرجع تأكيداً في المتصفح → نُصدر الكود فوراً في Firebase.

## الخطوات (مرة واحدة، 10 دقائق)

1. ادخل: https://developer.paypal.com/dashboard/applications/live
2. سجّل الدخول بنفس حساب PayPal: **hamidounaar22@gmail.com**
3. Create App → اسم مثلاً `Pharis`
4. انسخ **Client ID**
5. افتح `pharmacy-owner.html`
6. استبدل:
   `YOUR_PAYPAL_CLIENT_ID`
   بمعرّف العميل الذي نسخته
7. ارفع الملف إلى GitHub

## ماذا يحدث بعد الدفع؟
1. المشترك يضغط PayPal ويدفع $4 أو $40
2. النظام ينشئ كوداً في Firestore (`activation_codes`)
3. يظهر الكود على الشاشة فوراً (مع زر نسخ)
4. يدخله في التطبيق → شارة مميزة مباشرة

## CCP
يبقى يدوياً عبر واتساب 0559856169 (لا يمكن أتمتته بدون ربط بنكي).

## أمان Firebase
يفضّل قواعد Firestore تمنع قراءة كل الأكواد للعامة، وتسمح بالإنشاء المحدود.
## Client ID الحالي
تم إدراج Client ID في pharmacy-owner.html

إذا كان من وضع Sandbox: الدفع تجريبي فقط.
للأموال الحقيقية: انسخ Client ID من وضع Live واستبدله في السطر:
script src="https://www.paypal.com/sdk/js?client-id=...."
