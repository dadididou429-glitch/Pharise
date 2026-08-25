#!/usr/bin/env python3
"""
تحويل annumed_raw.csv → pharis_annumed_candidates.json
صيغة قريبة من pharmacies_submitted (للمراجعة قبل الاستيراد).
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

INP = Path(__file__).resolve().parent / "annumed_raw.csv"
OUT = Path(__file__).resolve().parent / "pharis_annumed_candidates.json"


def clean(v: str) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


def parse_hours(hours_raw: str) -> dict:
    h = clean(hours_raw)
    if h in {"24/7", "24h", "24"}:
        return {"open": 0, "close": 24, "onDuty": True}
    m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?", h)
    if m:
        o = int(m.group(1))
        c = int(m.group(3))
        return {"open": o, "close": c, "onDuty": False}
    return {"open": 8, "close": 21, "onDuty": False}


def main() -> None:
    if not INP.exists():
        raise SystemExit(f"Missing {INP} — run scrape_annumed.py first")

    rows = []
    with INP.open(encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            name = clean(r.get("name_raw"))
            if not name:
                continue
            hours = parse_hours(r.get("hours_raw") or "")
            lat = r.get("lat") or ""
            lng = r.get("lng") or ""
            try:
                lat_f = float(lat) if lat else None
                lng_f = float(lng) if lng else None
            except ValueError:
                lat_f = lng_f = None

            item = {
                "id": r.get("id") or "",
                "name": name[:80],
                "address": clean(r.get("address_raw"))[:200],
                "phone": clean(r.get("phone_raw"))[:20] or None,
                "lat": lat_f,
                "lng": lng_f,
                "hours": {"open": hours["open"], "close": hours["close"]},
                "onDuty": hours["onDuty"],
                "verified": False,
                "featured": False,
                "source": "annumed",
                "source_url": r.get("source_url") or "",
                "needs_review": True,
            }
            rows.append(item)

    # إزالة تكرار تقريبي بالاسم
    seen = set()
    unique = []
    for it in rows:
        key = re.sub(r"[^a-z0-9\u0600-\u06ff]+", "", it["name"].lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(it)

    OUT.write_text(json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} — {len(unique)} candidates (from {len(rows)} rows)")


if __name__ == "__main__":
    main()
