# Pharis — Data Pipeline (AnnuMed)

## التثبيت في المستودع

ضع الملفات هكذا:

```
Pharise/
  data-pipeline/
    requirements.txt
    scrape_annumed.py
    convert_to_pharis.py
  .github/
    workflows/
      collect-pharmacies.yml
```

ثم Commit + Push.

## التشغيل

1. GitHub → **Actions**
2. **Collect Algeria Pharmacies**
3. **Run workflow**
4. حمّل الـ artifact: `annumed-pharmacies`

### المخرجات

| ملف | المحتوى |
|-----|---------|
| `annumed_raw.csv` | خام من AnnuMed (اسم، رابط، تفاصيل إن وُجدت) |
| `pharis_annumed_candidates.json` | مرشّح لصيغة Pharis — **للمراجعة فقط** |

## لا تستورد مباشرة إلى Firebase

1. راجع الأسماء والعناوين
2. أزل التكرار مع `geo-pharmacies.json` / البيانات المحلية
3. تأكد من الإحداثيات قبل الاستيراد

## تشغيل محلي (مُفضّل إن حجب GitHub)

```bash
cd data-pipeline
pip install -r requirements.txt
python scrape_annumed.py
python convert_to_pharis.py
```

لجلب تفاصيل محدودة عدّل في `scrape_annumed.py`:

```python
MAX_DETAIL = 200   # بدل 0
```

## ملاحظات

- AnnuMed قد يحجب IP خارج الجزائر أو runners على GitHub → 0 سجلات
- لا تضع مفاتيح Firebase أو service account في المستودع
- الإصدار الأول يركّز على الروابط؛ التفاصيل خطوة ثانية
