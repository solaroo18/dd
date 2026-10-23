# دليل تشغيل ونشر الموقع على Vercel (Vercel Deployment Guide)

تمت إعادة هندسة وتصميم الموقع بالكامل ليعمل بسلاسة فائقة بنظام **Serverless Architecture** على منصة **Vercel**.

---

## 🚀 طريقة النشر على Vercel (خطوات سريعة)

### الطريقة الأولى: عبر GitHub (موصى بها)
1. ارفع المشروع إلى حسابك على **GitHub**.
2. توجّه إلى [Vercel Dashboard](https://vercel.com/dashboard) واضغط **Add New > Project**.
3. اختر المستودع (Repository) واضغط **Import**.
4. سيقوم Vercel باكتشاف إعدادات [vercel.json](file:///home/ramzi/Netflix-NFToken-Generator/vercel.json) وملف الدخول [api/index.py](file:///home/ramzi/Netflix-NFToken-Generator/api/index.py) تلقائياً دون الحاجة لأي تعديل في إعدادات البناء (Build Command).
5. اضغط **Deploy**.

---

### الطريقة الثانية: عبر Vercel CLI مباشرة من الطرفية
```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 🔐 حفظ البيانات بشكل دائم على Vercel (Environment Variables)

نظراً لأن خوادم Vercel Serverless تعمل بنظام **Stateless** (إعادة تشغيل مستمرة للذاكرة المؤقتة)، تم تزويد الموقع بطبقة تخزين ذكية تدعم:

1. **النسخ التلقائي لملفات المستودع**:
   - يتم قراءة الكوكيز والمفاتيح الأساسية تلقائياً من المستودع وتهيئتها في `/tmp`.
2. **زر النسخ الفوري لمتغيرات البيئة (1-Click Env Export)**:
   - افتح لوحة التحكم (`/admin`) وتوجّه إلى **Settings**.
   - ستجد قسم **▲ Vercel Cloud Serverless Sync**.
   - اضغط على زر **Copy Vercel Environment Variables**.
   - الصق المتغيرات في لوحة Vercel تحت:
     `Project Settings > Environment Variables`.

### المتغيرات المدعومة:
- `COOKIES_POOL_DATA`: مصفوفة JSON لحسابات الكوكيز المتاحة.
- `ACCESS_KEYS_DATA`: كائن JSON لإعدادات ومفاتيح الوصول المصرحة.
- `ADMIN_CONFIG_DATA`: بيانات اعتماد المدير (اسم المستخدم والهاش السري).
- `FLASK_SECRET_KEY`: المفتاح السري لتشفير الجلسات (Session Encryption).
- `ADMIN_USERNAME` و `ADMIN_PASSWORD`: اسم وكلمة مرور المدير الافتراضية.

---

## 📁 هيكلية ملفات Vercel المضافة:
- [vercel.json](file:///home/ramzi/Netflix-NFToken-Generator/vercel.json): توجيه المسارات وربط الملفات الثابتة عبر Vercel Edge CDN، وتمرير الطلبات لـ `api/index.py`.
- [api/index.py](file:///home/ramzi/Netflix-NFToken-Generator/api/index.py): نقطة الدخول الرسمية لـ Vercel Serverless WSGI Handler.
- [.vercelignore](file:///home/ramzi/Netflix-NFToken-Generator/.vercelignore): استبعاد الملفات غير الضرورية لتسريع عملية البناء.
- [app.py](file:///home/ramzi/Netflix-NFToken-Generator/app.py): تم تحديثه بطبقة آمنة لقراءة وكتابة ملفات التخزين متوافقة 100% مع بيئة Vercel Read-Only Filesystem.
