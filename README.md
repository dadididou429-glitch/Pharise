# Pharis OpenClaw MCP

هذا المجلد يحتوي على جسر محلي يعمل عبر **Model Context Protocol (MCP)** ويمنح OpenClaw أدوات إدارية للتعامل مع مشروع Pharis في Firebase. الجسر لا يُضاف إلى GitHub Pages ولا يضع أي سر في `index.html`؛ بل يعمل كعملية محلية يطلقها OpenClaw ويستخدم Firebase Admin عبر ملف اعتماد محفوظ خارج المستودع.

## ما الذي يستطيع OpenClaw فعله؟

يستطيع المشرف أن يطلب باللغة الطبيعية قراءة الصيدليات المسجلة، البحث في OpenStreetMap، إضافة صيدلية، تعديلها، إخفاءها واسترجاعها، تفعيل الشارة، مراجعة طلبات الأدوية، تغيير حالة الطلب، قراءة قائمة المشرفين، وقراءة سجل التدقيق. عمليات الكتابة تسجّل تلقائيًا في مجموعة `audit_log`.

الحذف النهائي محمي بشرط إضافي: لا ينفذ الجسر `permanent=true` إلا إذا أرسل OpenClaw القيمة `confirmation=DELETE_PERMANENTLY` بعد أن يؤكد المشرف صراحةً. إخفاء صيدلية OpenStreetMap يضيف طبقة إخفاء داخل Pharis ولا يعدّل مصدر OpenStreetMap نفسه.

## المتطلبات

يجب تشغيل الجسر على نفس الجهاز أو الخادم الذي يعمل عليه OpenClaw، مع إصدار Node متوافق مع إصدار OpenClaw المثبت. يلزم حساب خدمة Firebase بصلاحية مناسبة لمشروع `maftouha-ap`. احفظ ملف JSON في مسار خاص خارج هذا المستودع، ولا ترفعه إلى GitHub.

## التثبيت

من داخل هذا المجلد:

```bash
npm install
```

عيّن متغيرات البيئة في جلسة OpenClaw أو في مدير خدمة النظام:

```bash
export FIREBASE_PROJECT_ID=maftouha-ap
export PHARIS_ADMIN_UID='UID-حساب-المشرف-الوحيد'
export GOOGLE_APPLICATION_CREDENTIALS='/مسار/خاص/firebase-service-account.json'
```

لا تستبدل `PHARIS_ADMIN_UID` بقيمة عشوائية. استخدم UID حساب Firebase Authentication الخاص بالمشرف الوحيد. الجسر يسجل القيمة فقط في التدقيق ولا يطبع ملف الاعتماد.

## إضافة الجسر إلى OpenClaw

يمكن حفظ تعريف خادم stdio في إعداد MCP الخاص بـ OpenClaw. مثال عام:

```json
{
  "mcpServers": {
    "pharis-admin": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/Pharise/openclaw-mcp/server.mjs"],
      "env": {
        "FIREBASE_PROJECT_ID": "maftouha-ap",
        "PHARIS_ADMIN_UID": "UID-حساب-المشرف",
        "GOOGLE_APPLICATION_CREDENTIALS": "/ABSOLUTE/PATH/firebase-service-account.json"
      }
    }
  }
}
```

في OpenClaw الحالي يمكن أيضًا استخدام أوامر إدارة خوادم MCP، مثل `openclaw mcp add` أو تعديل قسم `mcp.servers` من Control UI. لا تستخدم وضع الموافقة التلقائية إلا بعد مراجعة الأدوات؛ اترك الحذف النهائي خلف موافقة المشرف.

## أمثلة أوامر للمشرف

يمكنك كتابة أوامر طبيعية مثل:

```text
اعرض آخر 20 صيدلية مسجلة في سيدي بلعباس.
اعرض تفاصيل الصيدلية ذات المعرّف كذا.
عدّل عنوان الصيدلية كذا إلى العنوان الجديد ورقم الهاتف الجديد.
أخفِ هذه الصيدلية من التطبيق بسبب تكرار السجل، ولا تحذفها نهائيًا.
هل تريد حذفها نهائيًا؟ نعم، احذفها نهائيًا بعد عرض التفاصيل والتأكد من المعرّف.
فعّل الشارة المميزة للصيدلية ذات المعرّف كذا.
اعرض طلبات الأدوية النشطة وأوقف الطلب ذي المعرّف كذا.
اعرض آخر عمليات OpenClaw في سجل التدقيق.
```

يجب على OpenClaw عرض المعرّف والبيانات المستهدفة قبل أي حذف نهائي أو تغيير حساس، ثم طلب تأكيد واضح من المشرف.

## ملاحظات قبل الإنتاج

قواعد Firestore الحالية في جذر المشروع لا تطابق كل الحقول التي ترسلها الواجهة، كما أن مجلد `functions` غير موجود رغم الإشارة إليه في `firebase.json`. حساب الخدمة يتجاوز قواعد Firestore باستخدام Firebase Admin، ولذلك يجب حمايته على مستوى نظام التشغيل، وعدم تشغيل الجسر على جهاز مشترك أو تعريضه عبر HTTP عام.

هذه النسخة لا تعدّل بيانات OpenStreetMap، ولا تعدّل كلمات مرور Firebase، ولا تنفذ دفعات حذف جماعي. يمكن إضافة ذلك لاحقًا بعد تحديد سياسة موافقات منفصلة.

## اختبار محلي

```bash
npm run check
npm start
```

عند التشغيل الصحيح يجب أن تظهر رسالة الجاهزية في `stderr`. قناة `stdout` محجوزة لبروتوكول MCP، لذلك لا تضف `console.log` إلى الخادم؛ استخدم `console.error` للتشخيص.

## مصادر رسمية

- [OpenClaw MCP](https://docs.openclaw.ai/cli/mcp)
- [OpenClaw security](https://docs.openclaw.ai/gateway/security)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
