#!/usr/bin/env python3
"""
Pharis — جمع أولي لصيدليات AnnuMed (اسم + رابط + تفاصيل إن توفرت).
النتيجة: annumed_raw.csv
لا تستورد مباشرة إلى Firebase قبل التنظيف والدمج.
"""
from __future__ import annotations

import csv
import hashlib
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://annumed.sante-dz.com"
# مسارات محتملة لقائمة الصيدليات (يجرب بالترتيب)
LIST_CANDIDATES = [
    f"{BASE_URL}/filter/categorie/pharmacie",
    f"{BASE_URL}/filter/type/ph",
    f"{BASE_URL}/filter/categorie/Pharmacie",
]
OUTPUT = Path(__file__).resolve().parent / "annumed_raw.csv"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,ar;q=0.8,en;q=0.7",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
MAX_LIST_PAGES = 2000
MAX_DETAIL = 0  # 0 = لا يفتح صفحات التفاصيل (سريع). ضع مثلاً 500 لتجربة محدودة.
SLEEP_LIST = 0.8
SLEEP_DETAIL = 1.0

FIELDNAMES = [
    "id",
    "source",
    "source_url",
    "name_raw",
    "address_raw",
    "phone_raw",
    "hours_raw",
    "lat",
    "lng",
]


def clean(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


def make_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


def is_pharmacy_url(href: str) -> bool:
    h = href.lower()
    return "/pharmacie/" in h or "/detail/pharmacie/" in h


def extract_list_links(html: str, page_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    found = {}
    for a in soup.find_all("a", href=True):
        href = urljoin(page_url, a["href"])
        if not is_pharmacy_url(href):
            continue
        # تجاهل روابط التعليقات / tabs
        path = urlparse(href).path.rstrip("/")
        if path.endswith("/monavis") or path.endswith("/media"):
            continue
        name = clean(a.get_text(" ", strip=True))
        if not name or len(name) < 2:
            continue
        found[href] = {
            "source": "annumed",
            "source_url": href,
            "name_raw": name,
            "id": make_id(href),
            "address_raw": "",
            "phone_raw": "",
            "hours_raw": "",
            "lat": "",
            "lng": "",
        }
    return list(found.values())


def next_list_page(soup: BeautifulSoup, current: str, page_index: int, base_list: str) -> str | None:
    for a in soup.find_all("a", href=True):
        t = clean(a.get_text(" ", strip=True)).lower()
        if t in {"suivant", "next", "›", "»", ">", "page suivante"}:
            return urljoin(current, a["href"])
    # fallback شائع
    cand = f"{base_list}?page={page_index + 1}"
    if cand != current:
        return cand
    return None


def parse_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n", strip=True)
    out = {"address_raw": "", "phone_raw": "", "hours_raw": "", "lat": "", "lng": ""}

    # هاتف
    tel = soup.find("a", href=re.compile(r"^tel:", re.I))
    if tel:
        out["phone_raw"] = clean(tel.get("href", "").replace("tel:", ""))
    if not out["phone_raw"]:
        m = re.search(r"(?:0|\+213)[\d\s\-.]{8,18}", text)
        if m:
            out["phone_raw"] = clean(m.group(0))

    # إحداثيات من خرائط / JSON
    m = re.search(r"['\"]?(?:lat|latitude)['\"]?\s*[:=]\s*(-?\d+\.\d+)", html, re.I)
    if m:
        out["lat"] = m.group(1)
    m = re.search(r"['\"]?(?:lng|lon|longitude)['\"]?\s*[:=]\s*(-?\d+\.\d+)", html, re.I)
    if m:
        out["lng"] = m.group(1)
    m = re.search(r"maps\?q=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", html, re.I)
    if m and not out["lat"]:
        out["lat"], out["lng"] = m.group(1), m.group(2)

    # عنوان تقريبي: سطر بعد اسم الصيدلية أو قرب «Algérie»
    for line in text.split("\n"):
        line = clean(line)
        if not line or len(line) < 12:
            continue
        if re.search(r"alg[eé]rie|oran|alger|sidi|wilaya|cit[eé]|rue |av\.|avenue", line, re.I):
            if "heure" in line.lower() or "ouvert" in line.lower():
                continue
            out["address_raw"] = line[:200]
            break

    # ساعات مختصرة
    if re.search(r"24\s*/\s*7|toujours ouvert", text, re.I):
        out["hours_raw"] = "24/7"
    else:
        m = re.search(r"(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2})", text)
        if m:
            out["hours_raw"] = m.group(1)

    return out


def pick_start_url(session: requests.Session) -> str:
    for url in LIST_CANDIDATES:
        try:
            r = session.get(url, timeout=30)
            if r.status_code == 200 and len(r.text) > 500 and is_pharmacy_url(r.text.lower()) is False:
                # حتى لو لا يوجد رابط بعد، نجرّب إن الصفحة ليست فارغة
                if "pharmacie" in r.text.lower() or len(r.text) > 2000:
                    print(f"START: {url} (len={len(r.text)})", flush=True)
                    return url
            if r.status_code == 200 and ("/pharmacie/" in r.text or "Pharmacie" in r.text):
                print(f"START: {url} (len={len(r.text)})", flush=True)
                return url
            print(f"SKIP start {url} status={r.status_code} len={len(r.text)}", flush=True)
        except Exception as e:
            print(f"SKIP start {url}: {e}", flush=True)
    # افتراضي
    print(f"FALLBACK START: {LIST_CANDIDATES[0]}", flush=True)
    return LIST_CANDIDATES[0]


def main() -> None:
    session = requests.Session()
    session.headers.update(HEADERS)

    base_list = pick_start_url(session)
    url = base_list
    visited: set[str] = set()
    records: dict[str, dict] = {}

    for n in range(1, MAX_LIST_PAGES + 1):
        if not url or url in visited:
            break
        print(f"[list {n}] {url}", flush=True)
        visited.add(url)
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
        except Exception as e:
            print(f"ERROR list: {e}", flush=True)
            break
        if len(r.text) < 200:
            print("WARNING: empty/short page — site may block this IP", flush=True)
            break

        for row in extract_list_links(r.text, url):
            records[row["source_url"]] = row

        soup = BeautifulSoup(r.text, "html.parser")
        nxt = next_list_page(soup, url, n, base_list)
        if not nxt or nxt in visited:
            break
        url = nxt
        time.sleep(SLEEP_LIST)

    print(f"LIST DONE: {len(records)} unique pharmacy links", flush=True)

    # تفاصيل اختيارية
    if MAX_DETAIL and records:
        for i, (href, row) in enumerate(list(records.items())[:MAX_DETAIL], 1):
            print(f"[detail {i}/{min(MAX_DETAIL, len(records))}] {href}", flush=True)
            try:
                r = session.get(href, timeout=30)
                if r.status_code == 200 and len(r.text) > 200:
                    extra = parse_detail(r.text)
                    row.update({k: v for k, v in extra.items() if v})
            except Exception as e:
                print(f"  detail error: {e}", flush=True)
            time.sleep(SLEEP_DETAIL)

    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDNAMES)
        w.writeheader()
        for row in records.values():
            w.writerow({k: row.get(k, "") for k in FIELDNAMES})

    print(f"WROTE {OUTPUT} — TOTAL {len(records)}", flush=True)
    if not records:
        print(
            "NOTE: 0 records. AnnuMed may block GitHub runners. "
            "Run scrape_annumed.py locally from Algeria if needed.",
            flush=True,
        )


if __name__ == "__main__":
    main()
