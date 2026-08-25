PHARIS DATA PIPELINE

1. Extract this ZIP into the root of your Pharise GitHub repository.
2. Commit the new files.
3. Open GitHub -> Actions.
4. Select "Collect Algeria Pharmacies".
5. Press "Run workflow".
6. After it finishes, download the artifact "annumed-pharmacies".

This first version collects AnnuMed records into annumed_raw.csv.
Do NOT import this raw file directly into Firebase yet: the next step is deduplication and merging with your existing geo-pharmacies.json.

Do not put Firebase service-account credentials in the repository.
