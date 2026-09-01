"""
Computes, for each month from the earliest available SPI-3 data (1990-03)
through the present, the percent of the Panaewa area falling into each
SPI-3 (3-month Standardized Precipitation Index) drought/wetness category.

Same category thresholds/labels as dews-hawaii-app/scripts/drought.ipynb,
but masked to the Panaewa boundary instead of computed statewide.

Rasters are downloaded into memory and never written to disk - only the
per-category percentages (of Panaewa's valid pixels) are kept.

Resumable: re-running this script skips months already present in the
output CSV, so it can be safely stopped and restarted after a network
failure.
"""

import os
import sys
import time
import csv
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from zoneinfo import ZoneInfo
from datetime import datetime

import requests
import numpy as np
import geopandas as gpd
from rasterio.io import MemoryFile
from rasterio.mask import mask
from dotenv import load_dotenv

load_dotenv()

API_TOKEN = os.getenv("HCDP_API_KEY")
if not API_TOKEN:
    sys.exit("HCDP_API_KEY not set (check scripts/.env)")

HEADER = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
}

DATA_PATH = "../data"
OUT_CSV = os.path.join(DATA_PATH, "spi3_distribution_panaewa.csv")
ERROR_LOG = os.path.join(DATA_PATH, "spi3_distribution_panaewa.errors.log")

START_MONTH = (1990, 3)  # earliest month HCDP has SPI-3 data for
# Most recent month with data lags by ~1 calendar month behind "today"
_now_hst = datetime.now(ZoneInfo("Pacific/Honolulu"))
END_MONTH = (_now_hst.year, _now_hst.month)

REQUEST_TIMEOUT = 60
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 5
MAX_WORKERS = 8

# Same thresholds/labels as dews-hawaii-app/scripts/drought.ipynb
THRESHOLDS = [
    (-np.inf, -2.0, "D4"),
    (-2.0, -1.6, "D3"),
    (-1.6, -1.3, "D2"),
    (-1.3, -0.8, "D1"),
    (-0.8, -0.5, "D0"),
    (-0.5, 0.5, "Near Normal"),
    (0.5, 0.8, "W0"),
    (0.8, 1.3, "W1"),
    (1.3, 1.6, "W2"),
    (1.6, 2.0, "W3"),
    (2.0, np.inf, "W4"),
]
LABELS = [t[2] for t in THRESHOLDS]

shapefile = gpd.read_file(os.path.join(DATA_PATH, "panaewa.shp"))
_geoms = shapefile.geometry.values
_thread_local = threading.local()
_csv_lock = threading.Lock()


def get_session():
    if not hasattr(_thread_local, "session"):
        _thread_local.session = requests.Session()
    return _thread_local.session


def month_range(start, end):
    y, m = start
    while (y, m) <= end:
        yield y, m
        m += 1
        if m > 12:
            m = 1
            y += 1


def already_done_months():
    if not os.path.exists(OUT_CSV):
        return set()
    with open(OUT_CSV, newline="") as f:
        reader = csv.DictReader(f)
        return {row["month"] for row in reader}


def fetch_panaewa_spi3(year: int, month: int):
    """Download the SPI-3 raster for year-month into memory, return the
    array of values for pixels within the Panaewa boundary, or None if
    the raster is unavailable for that month."""
    date_str = f"{year:04d}-{month:02d}"
    url = (
        "https://api.hcdp.ikewai.org/raster?"
        f"datatype=spi&period=month&timescale=timescale003&date={date_str}"
    )

    session = get_session()
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = session.get(url, headers=HEADER, timeout=REQUEST_TIMEOUT)
        except requests.exceptions.RequestException:
            if attempt == MAX_RETRIES:
                raise
            time.sleep(RETRY_BACKOFF_SECONDS * attempt)
            continue

        if r.status_code == 404:
            return None
        if r.status_code >= 500 and attempt < MAX_RETRIES:
            time.sleep(RETRY_BACKOFF_SECONDS * attempt)
            continue

        r.raise_for_status()

        with MemoryFile(r.content) as memfile:
            with memfile.open() as src:
                out_img, _ = mask(src, _geoms, crop=True, nodata=src.nodata)
                arr = out_img[0]
                valid = arr != src.nodata
                return arr[valid]

    return None


def process_month(year: int, month: int):
    month_str = f"{year:04d}-{month:02d}"
    try:
        values = fetch_panaewa_spi3(year, month)
    except Exception as e:
        return month_str, None, str(e)

    if values is None or values.size == 0:
        return month_str, None, None

    total = values.size
    pct = {}
    for lo, hi, label in THRESHOLDS:
        in_bin = (values >= lo) & (values < hi)
        pct[label] = round((in_bin.sum() / total) * 100.0, 2)

    return month_str, pct, None


def main():
    done = already_done_months()
    print(f"{len(done)} months already in {OUT_CSV}, resuming from there", flush=True)

    write_header = not os.path.exists(OUT_CSV)
    pending = [(y, m) for y, m in month_range(START_MONTH, END_MONTH) if f"{y:04d}-{m:02d}" not in done]
    total = len(pending)
    print(f"{total} months to fetch", flush=True)

    with open(OUT_CSV, "a", newline="") as out_f, open(ERROR_LOG, "a") as err_f:
        writer = csv.writer(out_f)
        if write_header:
            writer.writerow(["month"] + LABELS)
            out_f.flush()

        completed = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {pool.submit(process_month, y, m): (y, m) for y, m in pending}
            for future in as_completed(futures):
                month_str, pct, error = future.result()
                completed += 1
                with _csv_lock:
                    if error is not None:
                        err_f.write(f"{month_str}: {error}\n")
                        err_f.flush()
                        print(f"[{completed}/{total}] {month_str}: ERROR ({error})", flush=True)
                    elif pct is None:
                        writer.writerow([month_str] + [""] * len(LABELS))
                        out_f.flush()
                        print(f"[{completed}/{total}] {month_str}: no data", flush=True)
                    else:
                        writer.writerow([month_str] + [pct[label] for label in LABELS])
                        out_f.flush()
                        if completed % 25 == 0 or completed == total:
                            print(f"[{completed}/{total}] {month_str}: done", flush=True)

    sort_csv_by_month()
    print("Done:", OUT_CSV)


def sort_csv_by_month():
    with open(OUT_CSV, newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = sorted(reader, key=lambda row: row[0])
    with open(OUT_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


if __name__ == "__main__":
    main()
