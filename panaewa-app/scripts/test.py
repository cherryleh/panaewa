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

load_dotenv()
API_TOKEN = os.getenv("HCDP_API_KEY")
data_path = ''
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


def get_tif(url, file):
    print(f"Requesting: {url}")
    r = requests.get(url, headers=header)
    print("HTTP status:", r.status_code)

    if r.status_code == 404:
        print("→ Raster not available, skipping")
        return False

    r.raise_for_status()

    with open(file, "wb") as f:
        f.write(r.content)

    print("Saved:", file, "(", os.path.getsize(file), "bytes )")
    return True




spi_url = f'https://api.hcdp.ikewai.org/raster?date={yestYr}-{lastMonth:02d}&datatype=spi&timescale=timescale003&period=month'
spi3_file = os.path.join(data_path, "spi3.tif")
get_tif(spi_url, spi3_file)

ranchshp = gpd.read_file(os.path.join(data_path, "../data/panaewa.shp"))
rh_file=os.path.join(data_path, "relative_humidity_daily.tif")

def get_zonal_stats(file):
    with rasterio.open(file) as src:
        affine = src.transform
        array = src.read(1)
        df_zonal_stats = pd.DataFrame(zonal_stats(ranchshp, array, affine=affine,nodata=src.nodata,stats = ['mean']))
    return df_zonal_stats['mean'].iloc[0]


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

print(spi3)

