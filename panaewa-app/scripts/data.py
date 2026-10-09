import requests
import geopandas as gpd
import rasterio
import pandas as pd
from rasterstats import zonal_stats
import json
from datetime import datetime
from dateutil.relativedelta import relativedelta
import math
import os
import time
from zoneinfo import ZoneInfo


from dotenv import load_dotenv

load_dotenv()

API_TOKEN = os.getenv("HCDP_API_KEY")

data_path = '../data'
public_path = '../public'
header = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

print("HCDP_API_KEY loaded:", "yes" if os.getenv("HCDP_API_KEY") else "no")

now_hst = datetime.now(ZoneInfo("Pacific/Honolulu"))
yesterday_hst = now_hst - relativedelta(days=1)

yestYr, yestMonth, yestDay = yesterday_hst.year, yesterday_hst.month, yesterday_hst.day

last_month_hst = now_hst - relativedelta(months=1)
lastMonth = last_month_hst.month
lastMonthYr = last_month_hst.year


def get_tif(url, file, retries=3, backoff=30, timeout=60):
    print(f"Requesting: {url}")

    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, headers=header, timeout=timeout)
        except requests.exceptions.RequestException as e:
            print(f"Attempt {attempt}/{retries} failed: {e}")
            if attempt == retries:
                raise
            time.sleep(backoff * attempt)
            continue

        print("HTTP status:", r.status_code)

        if r.status_code == 404:
            print("→ Raster not available, skipping")
            return False

        if r.status_code >= 500 and attempt < retries:
            print(f"Attempt {attempt}/{retries} got HTTP {r.status_code}, retrying...")
            time.sleep(backoff * attempt)
            continue

        r.raise_for_status()

        with open(file, "wb") as f:
            f.write(r.content)

        print("Saved:", file, "(", os.path.getsize(file), "bytes )")
        return True



for i in range(0, 7):
    target_date = yesterday_hst - relativedelta(days=i)
    yyyy = target_date.year
    mm = target_date.month
    dd = target_date.day

    rf_url = (
        f"https://api.hcdp.ikewai.org/raster?"
        f"extent=statewide&date={yyyy}-{mm:02d}-{dd:02d}"
        f"&datatype=rainfall&period=day&production=new"
    )
    rf_file = os.path.join(data_path, f"rainfall_daily_t-{i+1}.tif")

    temp_url = (
        f"https://api.hcdp.ikewai.org/raster?"
        f"extent=statewide&date={yyyy}-{mm:02d}-{dd:02d}"
        f"&datatype=temperature&period=day&aggregation=mean"
    )
    temp_file = os.path.join(data_path, f"tmean_daily_t-{i+1}.tif")
    try:
        get_tif(rf_url, rf_file)
    except Exception as e:
        print(f"Failed to download {rf_file}: {e}")
        continue
    try:
        get_tif(temp_url, temp_file)
    except Exception as e:
        print(f"Failed to download {temp_file}: {e}")
        continue

rh_url = f'https://api.hcdp.ikewai.org/raster?extent=statewide&date={yestYr}-{yestMonth:02d}-{yestDay:02d}&datatype=relative_humidity&period=day'
rh_file=os.path.join(data_path, "relative_humidity_daily.tif")
try:
    get_tif(rh_url, rh_file)
except Exception as e:
    print(f"Failed to download {rh_file}: {e}")

spi_url = f'https://api.hcdp.ikewai.org/raster?date={yestYr}-{lastMonth:02d}&datatype=spi&timescale=timescale003&period=month'
spi3_file = os.path.join(data_path, "spi3.tif")
try:
    get_tif(spi_url, spi3_file)
except Exception as e:
    print(f"Failed to download {spi3_file}: {e}")

temp_m_url = f'https://api.hcdp.ikewai.org/raster?extent=statewide&date={lastMonthYr}-{lastMonth:02d}&datatype=temperature&period=month&aggregation=mean'
temp_m_file=os.path.join(data_path, "tmean_monthly.tif")
try:
    get_tif(temp_m_url, temp_m_file)
except Exception as e:
    print(f"Failed to download {temp_m_file}: {e}")

rf_m_url = f'https://api.hcdp.ikewai.org/raster?extent=statewide&date={lastMonthYr}-{lastMonth:02d}&datatype=rainfall&period=month&production=new'
rf_m_file=os.path.join(data_path, "rainfall_monthly.tif")
try:
    get_tif(rf_m_url, rf_m_file)
except Exception as e:
    print(f"Failed to download {rf_m_file}: {e}")

ranchshp = gpd.read_file(os.path.join(data_path, "panaewa.shp"))
rh_file=os.path.join(data_path, "relative_humidity_daily.tif")

def get_zonal_stats(file):
    with rasterio.open(file) as src:
        affine = src.transform
        array = src.read(1)
        df_zonal_stats = pd.DataFrame(zonal_stats(ranchshp, array, affine=affine,nodata=src.nodata,stats = ['mean']))
    return df_zonal_stats['mean'].iloc[0]

relative_humidity = get_zonal_stats(rh_file)

tmean_daily_file=os.path.join(data_path, "tmean_daily_t-1.tif")
temp_daily = get_zonal_stats(tmean_daily_file)

tmean_monthly = get_zonal_stats(temp_m_file)

tmean_climo_file=os.path.join(data_path, f"climatology/tmean_climo_{yestMonth:02d}.tif")
tmean_climo = get_zonal_stats(tmean_climo_file)
tmean_month_diff = (tmean_monthly-tmean_climo)

rf_daily_file=os.path.join(data_path, "rainfall_daily_t-1.tif")
rf_daily = get_zonal_stats(rf_daily_file)
rf_monthly = get_zonal_stats(rf_m_file)

rf_climo_file=os.path.join(data_path, f"climatology/rf_climo_{lastMonth:02d}.tif")
rf_climo = get_zonal_stats(rf_climo_file)
rf_pdiff = (rf_monthly-rf_climo)/(rf_climo)

spi3 = get_zonal_stats(spi3_file)
if spi3 <= -2.0:
    drought = "Exceptional Drought"
elif spi3 <= -1.6:
    drought = "Extreme Drought"
elif spi3 <= -1.3:
    drought = "Severe Drought"
elif spi3 <= -0.8:
    drought = "Moderate Drought"
elif spi3 <= 0.5:
    drought = "Abnormally Dry"
else:
    drought = "None"


lat, lon = 19.684, -155.052


def distance_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def get_daily_pm25_aqi(day, max_km=37):  # 37 km ~ the 23 mi radius the old AirNow API call used
    """24-hr PM2.5 AQI for `day` from the nearest AirNow monitor (no API key needed).

    daily_data_v2.dat columns: date|AQSID|site|parameter|units|value|hours|agency|AQI|category|lat|lon|full AQSID
    """
    url = f"https://files.airnowtech.org/airnow/{day:%Y}/{day:%Y%m%d}/daily_data_v2.dat"
    print(f"Requesting: {url}")
    r = requests.get(url, timeout=60)
    r.raise_for_status()

    best = None
    for line in r.text.splitlines():
        cols = line.split("|")
        if len(cols) < 12 or cols[3] != "PM2.5-24hr" or cols[8] == "-999":
            continue
        dist = distance_km(lat, lon, float(cols[10]), float(cols[11]))
        if dist <= max_km and (best is None or dist < best[0]):
            best = (dist, int(cols[8]), cols[2])

    if best is None:
        return None
    print(f"PM2.5 24-hr AQI {best[1]} from {best[2]} ({best[0]:.1f} km)")
    return best[1]


# AirNow failures shouldn't block the rest of the update
pm25_aqis = None
for days_back in (1, 2):  # fall back a day if yesterday's file isn't posted yet
    try:
        pm25_aqis = get_daily_pm25_aqi(now_hst - relativedelta(days=days_back))
    except Exception as e:
        print(f"AirNow daily file failed: {type(e).__name__}: {e}")
    if pm25_aqis is not None:
        break

if pm25_aqis is None:
    air_quality = "NA"
elif pm25_aqis <= 50:
    air_quality = "Good"
elif pm25_aqis <= 100:
    air_quality = "Moderate"
elif pm25_aqis <= 150:
    air_quality = "Unhealthy for Sensitive Groups"
elif pm25_aqis <= 200:
    air_quality = "Unhealthy"
elif pm25_aqis <= 300:
    air_quality = "Very Unhealthy"
elif pm25_aqis >= 300:
    air_quality = "Hazardous"
else:
    air_quality = "NA"



data = {
    "YestYr": yestYr,
    "YestMonth": yestMonth,
    "YestDay": yestDay,
    "LastMonth": lastMonth,
    "LastMonthYr": lastMonthYr,
    "relative_humidity": round(relative_humidity,0),
    "tmean_daily": round((temp_daily* 9/5) + 32,0),
    "tmean_monthly": round((tmean_monthly* 9/5) + 32,0),
    "tmean_diff":round((tmean_month_diff* 9/5),2),
    "rf_daily": round(rf_daily/25.4,2),
    "rf_monthly": round(rf_monthly/25.4,0),
    "rf_pdiff": round(rf_pdiff*100,0),
    "drought": f"{drought}",
    "air_quality": f"{air_quality}"
}

with open(os.path.join(public_path, "weather_vars.json"), "w") as f_out:
    json.dump(data, f_out, indent=4)


rf_tpl   = os.path.join(data_path, "rainfall_daily_t-{i}.tif")
temp_tpl = os.path.join(data_path, "tmean_daily_t-{i}.tif")


def zonal_stat(array, affine, nodata, geodf, stat):
    df = pd.DataFrame(
        zonal_stats(geodf, array, affine=affine, nodata=nodata, stats=[stat])
    )
    vals = df[stat]
    if len(vals) == 1:
        return None if pd.isna(vals.iloc[0]) else float(vals.iloc[0])
    return [None if pd.isna(v) else float(v) for v in vals]

records = []
for i in range(1, 8):
    rf_path   = rf_tpl.format(i=i)
    temp_path = temp_tpl.format(i=i)

    rf_val = None
    temp_val = None

    try:
        rf_val = get_zonal_stats(rf_path)
    except Exception:
        pass

    try:
        temp_val = get_zonal_stats(temp_path)
    except Exception:
        pass

    dt = now_hst - relativedelta(days=i)

    records.append({
        "date": dt.strftime("%Y-%m-%d"),
        "rf_sum": None if rf_val is None else rf_val / 25.4,
        "temp_mean": None if temp_val is None else (temp_val * 9/5) + 32
    })


records.sort(key=lambda r: r["date"])

with open(os.path.join(public_path, "rf_temp_timeseries.json"), "w") as f:
    json.dump(records, f, indent=2)

