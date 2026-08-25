import csv, hashlib, re, time
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://annumed.sante-dz.com"
START_URL = f"{BASE_URL}/filter/type/ph"
OUTPUT = Path("annumed_raw.csv")
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PharisDataCollector/1.0)"}

def clean(v): return re.sub(r"\s+", " ", str(v or "")).strip()
def make_id(url): return hashlib.sha1(url.encode("utf-8")).hexdigest()

def extract_page(html, page_url):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for a in soup.find_all("a", href=True):
        href = urljoin(page_url, a["href"])
        text = clean(a.get_text(" ", strip=True))
        if text and "/pharmacie/" in href:
            rows.append({"source":"annumed","source_url":href,"name_raw":text,"id":make_id(href)})
    unique = {}
    for r in rows: unique[r["source_url"]] = r
    return list(unique.values())

def next_page(soup, current):
    for a in soup.find_all("a", href=True):
        t = clean(a.get_text(" ", strip=True)).lower()
        if t in {"suivant","next","›","»",">"}:
            return urljoin(current, a["href"])
    return None

def main():
    session = requests.Session(); session.headers.update(HEADERS)
    url, visited, records = START_URL, set(), {}
    max_pages = 1500
    for n in range(1, max_pages + 1):
        if not url or url in visited: break
        print(f"[{n}] {url}", flush=True); visited.add(url)
        r = session.get(url, timeout=30); r.raise_for_status()
        for row in extract_page(r.text, url): records[row["source_url"]] = row
        soup = BeautifulSoup(r.text, "html.parser")
        nxt = next_page(soup, url) or f"{START_URL}?page={n+1}"
        if nxt in visited: break
        url = nxt; time.sleep(0.7)
    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["source","source_url","name_raw","id"])
        w.writeheader(); w.writerows(records.values())
    print(f"TOTAL RECORDS: {len(records)}")

if __name__ == "__main__": main()
