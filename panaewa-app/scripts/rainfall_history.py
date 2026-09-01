"""
Builds a daily time series CSV of Panaewa-area average rainfall from 1990-01-01
through yesterday (HST), using the HCDP statewide daily rainfall raster.

Rasters are downloaded into memory and never written to disk - only the
zonal (spatial) mean over the Panaewa boundary is kept.

Resumable: re-running this script skips dates already present in the output
CSV, so it can be safely stopped and restarted after a network failure.
"""

import os
import sys
import time
import csv
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from zoneinfo import ZoneInfo
from datetime import datetime

import requests
import geopandas as gpd
import rasterio
from rasterio.io import MemoryFile
from rasterstats import zonal_stats
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
OUT_CSV = os.path.join(DATA_PATH, "rainfall_daily_1990_present.csv")
ERROR_LOG = os.path.join(DATA_PATH, "rainfall_daily_1990_present.errors.log")

START_DATE = date(1990, 1, 1)
END_DATE = (datetime.now(ZoneInfo("Pacific/Honolulu")) - timedelta(days=1)).date()

REQUEST_TIMEOUT = 60
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 5
MAX_WORKERS = 8

shapefile = gpd.read_file(os.path.join(DATA_PATH, "panaewa.shp"))
_thread_local = threading.local()
_csv_lock = threading.Lock()


def get_session():
    if not hasattr(_thread_local, "session"):
        _thread_local.session = requests.Session()
    return _thread_local.session


def already_done_dates():
    if not os.path.exists(OUT_CSV):
        return set()
    with open(OUT_CSV, newline="") as f:
        reader = csv.DictReader(f)
        return {row["date"] for row in reader}


def fetch_daily_mean_mm(day: date):
    """Download the rainfall raster for `day` into memory, return the
    Panaewa-area spatial mean in mm, or None if unavailable."""
    url = (
        "https://api.hcdp.ikewai.org/raster?"
        f"extent=statewide&date={day.isoformat()}"
        "&datatype=rainfall&period=day&production=new"
    )

    session = get_session()
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = session.get(url, headers=HEADER, timeout=REQUEST_TIMEOUT)
        except requests.exceptions.RequestException as e:
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
                affine = src.transform
                array = src.read(1)
                stats = zonal_stats(
                    shapefile, array, affine=affine, nodata=src.nodata, stats=["mean"]
                )
        return stats[0]["mean"]

    return None


def process_day(day: date):
    iso = day.isoformat()
    try:
        mean_mm = fetch_daily_mean_mm(day)
    except Exception as e:
        return iso, None, str(e)
    if mean_mm is None:
        return iso, "", None
    return iso, round(mean_mm / 25.4, 3), None


def main():
    done = already_done_dates()
    print(f"{len(done)} dates already in {OUT_CSV}, resuming from there", flush=True)

    write_header = not os.path.exists(OUT_CSV)
    all_days = [
        START_DATE + timedelta(days=i)
        for i in range((END_DATE - START_DATE).days + 1)
    ]
    pending = [d for d in all_days if d.isoformat() not in done]
    total = len(pending)
    print(f"{total} dates to fetch", flush=True)

    with open(OUT_CSV, "a", newline="") as out_f, open(ERROR_LOG, "a") as err_f:
        writer = csv.writer(out_f)
        if write_header:
            writer.writerow(["date", "rainfall_in"])
            out_f.flush()

        completed = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {pool.submit(process_day, d): d for d in pending}
            for future in as_completed(futures):
                iso, value, error = future.result()
                completed += 1
                with _csv_lock:
                    if error is not None:
                        err_f.write(f"{iso}: {error}\n")
                        err_f.flush()
                        print(f"[{completed}/{total}] {iso}: ERROR ({error})", flush=True)
                    else:
                        writer.writerow([iso, value])
                        out_f.flush()
                        if completed % 50 == 0 or completed == total:
                            print(f"[{completed}/{total}] {iso}: {value}", flush=True)

    sort_csv_by_date()
    print("Done:", OUT_CSV)


def sort_csv_by_date():
    """Rows are appended in completion order (not chronological, since
    fetches run concurrently) - sort the file once everything is written."""
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
