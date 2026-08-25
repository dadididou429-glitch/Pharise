PHARIS DATA PIPELINE

1. ضع هذا المجلد data-pipeline في جذر مستودع Pharise
2. ضع collect-pharmacies.yml في .github/workflows/
3. Commit + Push
4. Actions → Collect Algeria Pharmacies → Run workflow
5. حمّل artifact annumed-pharmacies

لا تستورد annumed_raw.csv مباشرة إلى Firebase.
استخدم convert_to_pharis.py ثم راجع يدوياً.
