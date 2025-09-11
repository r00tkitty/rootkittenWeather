# website health route (is it alive)
from fastapi import FastAPI # import fastapi
from fastapi.middleware.cors import CORSMiddleware #import cors bullshit
import time # hey what time is it

app = FastAPI(title="rootkitten(weather); API") # name the app. 

# the cors bullshit in question
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # dev thing, allow from everywhere
    allow_methods=["*"], # dev thing, allow from everywhere
    allow_headers=["*"], # you get it by now
)

@app.get("/health") # URL will be rootkitten.dev/weather/health.
def health():
    return {"ok" : True, "t": int(time.time())}  # am i alive, what time is it


# oh boy now the actual API requests part
import requests

BASE_GEO = "https://geocoding-api.open-meteo.com/v1/search"

@app.get("/search") #ditto, except URL ends with search
def search(q: str, count: int = 5, language : str = "en"):

    try: 
        res = requests.get(BASE_GEO, params={
            "name": q,
            "count": count,
            "language": language,
            "format": "json"
        }, timeout=8)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        return {"error": str(e)}
    
    results = data.get("results", [])
    out = [
        {
            "name": f"{r['name']}, {r.get('country', '')}".strip(", "),
            "lat": r["latitude"],
            "lon": r["longitude"]

        }
        for r in results
    ]
    return out

# the forecast
BASE_FORECAST = "https://api.open-meteo.com/v1/forecast"
@app.get("/weather")
def weather (lat: float, lon:float, days: int = 7, timezone: str="auto" ):
    try:
        res = requests.get(BASE_FORECAST, params={
            "latitude": lat,
            "longitude": lon,
            "timezone": timezone,
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index",
            "hourly": "temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max,wind_speed_10m_max",
            "forecast_days": days
        }, timeout=8)

        res.raise_for_status()
        data = res.json()
    except Exception as e:
        return {"error": str(e)
        }
    return data