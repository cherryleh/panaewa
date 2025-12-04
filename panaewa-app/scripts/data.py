import requests
import geopandas as gpd
import rasterio
import pandas as pd
from rasterstats import zonal_stats
import json
from datetime import datetime
from dateutil.relativedelta import relativedelta
import os
from zoneinfo import ZoneInfo


from dotenv import load_dotenv

load_dotenv()  # loads .env if present
API_TOKEN = os.getenv("HCDP_API_KEY")

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


def get_tif(url, file):
    print(f"Requesting: {url}")
    r = requests.get(url, headers=header)

    print("HTTP status:", r.status_code)

    if r.status_code != 200:
        print("Response preview:", r.text[:300])
        raise SystemExit("Download failed — server did not return a TIFF.")

    with open(file, "wb") as f:
        f.write(r.content)

    print("Saved:", file, "(", os.path.getsize(file), "bytes )")


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
    rf_file = f"../data/rainfall_daily_t-{i+1}.tif"

    temp_url = (
        f"https://api.hcdp.ikewai.org/raster?"
        f"extent=statewide&date={yyyy}-{mm:02d}-{dd:02d}"
        f"&datatype=temperature&period=day&aggregation=mean"
    )
    temp_file = f"../data/tmean_daily_t-{i+1}.tif"

    get_tif(rf_url, rf_file)
    get_tif(temp_url, temp_file)

rh_url = f'https://api.hcdp.ikewai.org/raster?extent=statewide&date={yestYr}-{yestMonth:02d}-{yestDay:02d}&datatype=relative_humidity&period=day'
rh_file=f"../data/relative_humidity_daily.tif"
get_tif(rh_url, rh_file)

spi_url = f'https://api.hcdp.ikewai.org/raster?extent=statewide&date={yestYr}-{yestMonth:02d}-{yestDay:02d}&datatype=relative_humidity&period=day'
spi3_file = f"../data/spi3.tif"
get_tif(spi_url, spi3_file)

temp_m_url = f'https://api.hcdp.ikewai.org/raster?extent=statewide&date={lastMonthYr}-{lastMonth:02d}&datatype=temperature&period=month&aggregation=mean'
temp_m_file=f"../data/tmean_monthly.tif"
get_tif(temp_m_url, temp_m_file)

rf_m_url = f'https://api.hcdp.ikewai.org/raster?extent=statewide&date={lastMonthYr}-{lastMonth:02d}&datatype=rainfall&period=month&production=new'
rf_m_file=f"../data/rainfall_monthly.tif"
get_tif(rf_m_url, rf_m_file)

ranchshp = gpd.read_file('../data/panaewa.shp')
rh_file=f"../data/relative_humidity_daily.tif"

def get_zonal_stats(file):
    with rasterio.open(file) as src:
        affine = src.transform
        array = src.read(1)
        df_zonal_stats = pd.DataFrame(zonal_stats(ranchshp, array, affine=affine,nodata=src.nodata,stats = ['mean']))
    return df_zonal_stats['mean'].iloc[0]

relative_humidity = get_zonal_stats(rh_file)

tmean_daily_file=f"../data/tmean_daily_t-1.tif"
temp_daily = get_zonal_stats(tmean_daily_file)

tmean_monthly = get_zonal_stats(temp_m_file)

tmean_climo_file=f"../data/climatology/tmean_climo_{yestMonth:02d}.tif"
tmean_climo = get_zonal_stats(tmean_climo_file)
tmean_month_diff = (tmean_monthly-tmean_climo)

rf_daily_file=f"../data/rainfall_daily_t-1.tif"
rf_daily = get_zonal_stats(rf_daily_file)
rf_monthly = get_zonal_stats(rf_m_file)

rf_climo_file=f"../data/climatology/rf_climo_{lastMonth:02d}.tif"
rf_climo = get_zonal_stats(rf_climo_file)
rf_pdiff = (rf_monthly-rf_climo)/(rf_climo)

spi3 = get_zonal_stats(spi3_file)
if spi3 <= -2.0:
    drought = "Exceptional"
elif spi3 <= -1.6:
    drought = "Extreme"
elif spi3 <= -1.3:
    drought = "Severe"
elif spi3 <= -0.8:
    drought = "Moderate"
elif spi3 <= 0.5:
    drought = "Abnormally Dry"
else:
    drought = "No"

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
    "rf_daily": round(rf_daily/25.4,0),
    "rf_monthly": round(rf_monthly/25.4,0),
    "rf_pdiff": round(rf_pdiff*100,0),
    "wind_speed": 10,  
    "wind_direction": "NE",
    "drought": f"{drought} Drought"
}

with open("../public/weather_vars.json", "w") as f_out:
    json.dump(data, f_out, indent=4) 





rf_tpl   = "../data/rainfall_daily_t-{i}.tif"
temp_tpl = "../data/tmean_daily_t-{i}.tif"  


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
    rf_val = get_zonal_stats(rf_path)
    temp_val = get_zonal_stats(temp_path)
    
    dt = now_hst - relativedelta(days=i)


    yestYr, yestMonth, yestDay = dt.timetuple()[:3]  # (year, month, day)

    records.append({
        "date": dt.strftime("%Y-%m-%d"),
        "rf_sum": rf_val/25.4,        # sum over polygon(s); float if one polygon else list
        "temp_mean": (temp_val* 9/5) + 32    # mean over polygon(s); float if one polygon else list
    })

records.sort(key=lambda r: r["date"])

with open("../public/rf_temp_timeseries.json", "w") as f:
    json.dump(records, f, indent=2)

