import requests
import os
from dotenv import load_dotenv

load_dotenv()


lat, lon = 19.684, -155.052


url = "https://www.airnowapi.org/aq/observation/latLong/current/"
params = {
    "format": "application/json",
    "latitude": lat,
    "longitude": lon,
    "distance": 23,         # miles
    "API_KEY": AIRNOW_TOKEN,
}

r = requests.get(url, params=params, timeout=30)
r.raise_for_status()
airnow_data = r.json()
pm25_aqis = [row.get("AQI") for row in airnow_data if row.get("ParameterName") == "PM2.5" and row.get("AQI") is not None][0]

if pm25_aqis <= 50:
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

print(air_quality)
